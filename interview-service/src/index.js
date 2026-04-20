require('../../shared/load-env');
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const { authenticate } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const interviewRoutes = require('./routes/interview.routes');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4003;

const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'], credentials: true },
});

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'interview-service' }));
app.use('/api/interviews', authenticate, interviewRoutes);

// Internal: update score from feedback-service
app.post('/api/interviews/internal/update-score', (req, res) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  const InterviewSession = require('./models/interview.model');
  const { sessionId, overallScore, feedbackId } = req.body;
  InterviewSession.findByIdAndUpdate(sessionId, { overallScore, feedbackId }).exec();
  res.json({ success: true });
});

app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);

// WebSocket - real-time interview
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token ||
      socket.handshake.headers?.cookie?.split('access_token=')[1]?.split(';')[0];
    if (!token) return next(new Error('Authentication required'));
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.user?.id}`);
  socket.on('join_session', (sessionId) => socket.join(`session:${sessionId}`));
  socket.on('leave_session', (sessionId) => socket.leave(`session:${sessionId}`));
  socket.on('answer_typing', (data) => socket.to(`session:${data.sessionId}`).emit('answer_update', data));
  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.user?.id}`));
});

app.set('io', io);

async function start() {
  await connectDB();
  await connectRedis();
  httpServer.listen(PORT, () => logger.info(`🎤 Interview Service on port ${PORT} (WebSocket enabled)`));
}
start();

// Additional peer interview WebSocket events
io.on('connection', (socket) => {
  // Peer room management
  const peerRooms = {};

  socket.on('peer_join_room', ({ roomId, userName }) => {
    const room = peerRooms[roomId] || { members: [] };
    const role = room.members.length === 0 ? 'interviewer' : 'candidate';
    room.members.push({ id: socket.id, userId: socket.user?.id, name: userName });
    peerRooms[roomId] = room;
    socket.join(`peer:${roomId}`);

    if (room.members.length === 2) {
      const partner = room.members.find(m => m.id !== socket.id);
      socket.emit('peer_room_joined', { partner, role });
      socket.to(`peer:${roomId}`).emit('peer_room_joined', {
        partner: { id: socket.id, name: userName },
        role: role === 'interviewer' ? 'candidate' : 'interviewer',
      });
    }
  });

  socket.on('peer_message', ({ roomId, text, userName }) => {
    socket.to(`peer:${roomId}`).emit('peer_message', { text, userName });
  });

  socket.on('peer_set_question', ({ roomId, question }) => {
    socket.to(`peer:${roomId}`).emit('peer_question_set', { question });
  });

  socket.on('disconnecting', () => {
    socket.rooms.forEach(room => {
      if (room.startsWith('peer:')) {
        socket.to(room).emit('peer_partner_left');
      }
    });
  });
});
