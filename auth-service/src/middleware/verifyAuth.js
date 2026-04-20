const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../utils/tokens');

const verifyAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) return res.status(401).json({ success: false, message: 'Token has been revoked' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = { verifyAuth };
