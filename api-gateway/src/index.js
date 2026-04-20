require('../../shared/load-env');
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const logger = require('./config/logger');
const { verifyToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.GATEWAY_PORT || 4000;

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(cookieParser(process.env.COOKIE_SECRET));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ─── GLOBAL RATE LIMIT ───────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// ─── AUTH RATE LIMIT ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many auth attempts. Please try again after 15 minutes.' },
});

// ─── HEALTH CHECK ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ─── PROXY CONFIG ────────────────────────────────────────────
const proxyOptions = (target) => ({
  target,
  // changeOrigin: true,
  changeOrigin: true,
  proxyTimeout: 60000,
  timeout: 60000,
  on: {
    error: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`);
      res.status(502).json({ success: false, message: 'Service temporarily unavailable' });
    },
    proxyReq: (proxyReq, req) => {
      // Forward user info to services
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-User-Email', req.user.email);
      }
      proxyReq.setHeader('X-Internal-Secret', process.env.INTERNAL_SERVICE_SECRET || '');
    },
  },
});

// ─── PUBLIC ROUTES (No Auth) ─────────────────────────────────
app.use('/api/auth',
  authLimiter,
  createProxyMiddleware(proxyOptions(process.env.AUTH_SERVICE_URL))
);

// ─── PROTECTED ROUTES (Auth Required) ────────────────────────
app.use('/api/users',
  verifyToken,
  createProxyMiddleware(proxyOptions(process.env.USER_SERVICE_URL))
);

app.use('/api/interviews',
  verifyToken,
  createProxyMiddleware(proxyOptions(process.env.INTERVIEW_SERVICE_URL))
);

app.use('/api/feedback',
  verifyToken,
  createProxyMiddleware(proxyOptions(process.env.FEEDBACK_SERVICE_URL))
);

app.use('/api/dsa',
  verifyToken,
  createProxyMiddleware(proxyOptions(process.env.DSA_SERVICE_URL))
);

app.use('/api/questions',
  createProxyMiddleware(proxyOptions(process.env.QUESTION_SERVICE_URL)) // public read
);

app.use('/api/analytics',
  verifyToken,
  createProxyMiddleware(proxyOptions(process.env.ANALYTICS_SERVICE_URL))
);

app.use('/api/resume',
  verifyToken,
  createProxyMiddleware(proxyOptions(process.env.RESUME_SERVICE_URL))
);

app.use('/api/jobs',
  createProxyMiddleware(proxyOptions(process.env.JOB_SERVICE_URL)) // public read
);

app.use('/api/community',
  createProxyMiddleware(proxyOptions(process.env.COMMUNITY_SERVICE_URL)) // public read, write needs auth handled inside
);

app.use('/api/gamification',
  verifyToken,
  createProxyMiddleware(proxyOptions(process.env.GAMIFICATION_SERVICE_URL))
);

app.use('/api/notifications',
  verifyToken,
  createProxyMiddleware(proxyOptions(process.env.NOTIFICATION_SERVICE_URL))
);

// ─── ADMIN ROUTES (Admin Auth Required) ──────────────────────
app.use('/api/admin',
  verifyToken,
  (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  },
  createProxyMiddleware(proxyOptions(process.env.ADMIN_SERVICE_URL))
);

// ─── 404 ─────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── ERROR HANDLER ───────────────────────────────────────────
app.use(errorHandler);

// ─── START ───────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`);
});

module.exports = app;
