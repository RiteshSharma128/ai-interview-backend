const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const connectDB = async () => {
  const client = await pool.connect();
  logger.info('✅ PostgreSQL connected');
  client.release();
};

module.exports = { pool, connectDB };
