const mongoose = require('mongoose');
const logger = require('./logger');
const connectDB = async () => { await mongoose.connect(process.env.MONGODB_URI); logger.info('✅ MongoDB connected (dsa-service)'); };
module.exports = { connectDB };
