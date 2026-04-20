require('../../shared/load-env'); require('express-async-errors');
const express = require('express');
const cors = require('cors'); const helmet = require('helmet'); const cookieParser = require('cookie-parser'); const morgan = require('morgan');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./config/logger');
const { authenticate } = require('./middleware/auth');
const feedbackRoutes = require('./routes/feedback.routes');
const app = express();
const PORT = process.env.PORT || 4004;
app.use(helmet()); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); app.use(express.json({ limit: '10mb' })); app.use(morgan('dev'));
app.get('/health', (req,res) => res.json({ status:'ok', service:'feedback-service' }));
app.use('/api/feedback', authenticate, feedbackRoutes);
app.use((err, req, res, next) => res.status(err.statusCode||500).json({ success:false, message: err.message||'Internal Server Error' }));
async function start() { await connectDB(); await connectRedis(); app.listen(PORT, () => logger.info(`📊 Feedback Service running on port ${PORT}`)); }
start(); module.exports = app;
