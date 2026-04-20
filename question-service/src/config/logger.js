const winston = require('winston');
module.exports = winston.createLogger({ level: process.env.LOG_LEVEL||'info', format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.printf(({timestamp,level,message})=>`[${timestamp}] [QUESTION] ${level}: ${message}`)), transports: [new winston.transports.Console()] });
