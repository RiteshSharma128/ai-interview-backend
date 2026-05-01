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
const analyticsRoutes = require('./routes/analytics.routes');
const app = express();
const PORT = process.env.PORT || 4007;
app.use(helmet()); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req,res) => res.json({ status:'ok', service:'analytics-service' }));
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use((err, req, res, next) => res.status(err.statusCode||500).json({ success:false, message:err.message||'Error' }));
async function start()
{
  // await connectDB(); 
  try {
  await connectDB();
} catch (err) {
  console.error('Analytics DB connection failed:', err.message);
  process.exit(0);
}
  await connectRedis(); app.listen(PORT, () => logger.info(`📈 Analytics Service on port ${PORT}`)); }
start();
