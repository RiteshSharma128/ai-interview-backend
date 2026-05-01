
const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const connectDB = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      client.release();
      logger.info('✅ PostgreSQL connected');
      return;
    } catch (err) {
      retries--;
      logger.warn(`DB connection failed, retrying... (${retries} left): ${err.message}`);
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

module.exports = { pool, connectDB };
