require('../../shared/load-env');
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const passport = require('passport');

const logger = require('./config/logger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
require('./config/passport');

const authRoutes = require('./routes/auth.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4001;

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());

// ─── INTERNAL REQUEST GUARD ───────────────────────────────────
// Reject requests not coming from the gateway (except in dev)
app.use((req, res, next) => {
  const internalSecret = req.headers['x-internal-secret'];
  const gatewayForwarded = req.headers['x-forwarded-by-gateway'];

  // In production, enforce internal secret
  if (process.env.NODE_ENV === 'production') {
    if (internalSecret !== process.env.INTERNAL_SERVICE_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden: Direct access not allowed' });
    }
  }
  next();
});

// ─── HEALTH ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

// ─── ROUTES ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── 404 ─────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── ERROR HANDLER ───────────────────────────────────────────
app.use(errorHandler);

// ─── START SERVER ────────────────────────────────────────────
async function startServer() {
  try {
    await connectDB();
    await connectRedis();
    app.listen(PORT, () => {
      logger.info(`🔐 Auth Service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start auth service:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
