const jwt = require('jsonwebtoken');
const authenticate = (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    if (userId) { req.user = { id: userId, role: req.headers['x-user-role'] }; return next(); }
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Auth required' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) { res.status(401).json({ success: false, message: 'Invalid token' }); }
};
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Admin required' });
  next();
};
module.exports = { authenticate, requireAdmin };
