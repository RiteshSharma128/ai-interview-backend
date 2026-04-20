const jwt = require('jsonwebtoken');
const authenticate = (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const userEmail = req.headers['x-user-email'];
    if (userId) { req.user = { id: userId, role: userRole, email: userEmail }; return next(); }
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) { res.status(401).json({ success: false, message: 'Invalid token' }); }
};
module.exports = { authenticate };
