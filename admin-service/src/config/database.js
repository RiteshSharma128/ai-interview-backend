const { Pool } = require('pg');
const mongoose = require('mongoose');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false });
const connectDB = async () => {
  const c = await pool.connect(); console.log('✅ PostgreSQL (admin)'); c.release();
  await mongoose.connect(process.env.MONGODB_URI); console.log('✅ MongoDB (admin)');
};
module.exports = { pool, connectDB };
