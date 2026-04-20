const { verifyRefreshToken } = require('../utils/tokens');

const verifyRefreshTokenMiddleware = async (req, res, next) => {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }
  req.refreshToken = token;
  next();
};

const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { verifyRefreshTokenMiddleware, errorHandler };
