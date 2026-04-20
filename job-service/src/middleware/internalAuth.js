const internalAuth = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];
  if (process.env.NODE_ENV === 'production' && secret !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  req.userId = req.headers['x-user-id'];
  req.userRole = req.headers['x-user-role'];
  req.userEmail = req.headers['x-user-email'];
  next();
};
module.exports = { internalAuth };
