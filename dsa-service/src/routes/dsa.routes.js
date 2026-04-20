const express = require('express');
const router = express.Router();
const c = require('../controllers/dsa.controller');
const { authenticate } = require('../middleware/auth');

// optionalAuth — user optional (public browse)
const optionalAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) req.user = { id: userId, role: req.headers['x-user-role'] };
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {}
  }
  next();
};

router.get('/problems', optionalAuth, c.getProblems);
router.get('/problems/:slug/hints', authenticate, c.getHint);
router.get('/problems/:slug/submissions', authenticate, c.getSubmissions);
router.get('/problems/:slug', optionalAuth, c.getProblem);
router.post('/problems/:slug/submit', authenticate, c.submitCode);
router.post('/run', authenticate, c.runCode);
router.get('/stats', authenticate, c.getUserStats);

module.exports = router;
