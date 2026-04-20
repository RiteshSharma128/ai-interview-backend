const logger = require('../config/logger');
const errorHandler = (err, req, res, next) => {
  logger.error(err.message);
  res.status(err.statusCode||err.status||500).json({ success: false, message: err.message||'Internal Server Error' });
};
module.exports = { errorHandler };
