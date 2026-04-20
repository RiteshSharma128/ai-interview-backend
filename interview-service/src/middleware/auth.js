const jwt = require("jsonwebtoken");
const authenticate = (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    if (userId) { req.user = { id: userId, role: req.headers["x-user-role"], email: req.headers["x-user-email"] }; return next(); }
    const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) { res.status(401).json({ success: false, message: "Invalid token" }); }
};
const optionalAuth = (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    if (userId) { req.user = { id: userId, role: req.headers["x-user-role"] }; }
    else { const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1]; if (token) req.user = jwt.verify(token, process.env.JWT_SECRET); }
  } catch (e) {}
  next();
};
const errorHandler = (err, req, res, next) => res.status(err.statusCode||500).json({ success:false, message: err.message||"Internal Server Error" });
module.exports = { authenticate, optionalAuth, errorHandler };
