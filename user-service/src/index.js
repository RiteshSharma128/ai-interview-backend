require('../../shared/load-env');
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const { authenticate } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const userRoutes = require('./routes/user.routes');
const profileRoutes = require('./routes/profile.routes');

const app = express();
const PORT = process.env.PORT || 4002;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

// Internal route (no auth - called from auth-service)
app.post('/api/users/internal/create', (req, res) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  res.json({ success: true });
});

app.use('/api/users', authenticate, userRoutes);
app.use('/api/users/profile', authenticate, profileRoutes);

app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);

async function start() {
  await connectDB();
  await connectRedis();
  app.listen(PORT, () => logger.info(`👤 User Service running on port ${PORT}`));
}
start();

module.exports = app;
