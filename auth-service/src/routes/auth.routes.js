const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { verifyAuth } = require('../middleware/verifyAuth');

const signupRules = [
  body('name').trim().notEmpty().withMessage('Name required').isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('userType').optional().isIn(['student', 'professional']),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Support both /signup and /register (alias)
router.post('/signup', signupRules, validate, authController.register);
router.post('/register', signupRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', verifyAuth, authController.me);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', body('email').isEmail(), validate, authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
router.post('/change-password', verifyAuth, authController.changePassword);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  authController.oauthCallback
);
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  authController.oauthCallback
);

module.exports = router;
