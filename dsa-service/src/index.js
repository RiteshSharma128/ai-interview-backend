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
const dsaRoutes = require('./routes/dsa.routes');

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'dsa-service' }));
app.use('/api/dsa', authenticate, dsaRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

async function start() {
  await connectDB();
  await connectRedis();

  const { DSAProblem } = require('./models/dsa.model');
  const count = await DSAProblem.countDocuments();
  if (count === 0) {
    const { seedProblems } = require('./utils/seed');
    await seedProblems();
    logger.info('✅ DSA problems seeded');
  }

  app.listen(PORT, () => logger.info(`💻 DSA Service on port ${PORT}`));
}
start();
