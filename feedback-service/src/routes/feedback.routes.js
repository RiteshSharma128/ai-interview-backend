const express = require('express');
const router = express.Router();
const c = require('../controllers/feedback.controller');

router.post('/internal/generate', c.generateFeedback);
router.get('/session/:sessionId', c.getFeedbackBySession);
router.get('/history', c.getFeedbackHistory);
router.get('/trends', c.getPerformanceTrends);
router.get('/:feedbackId', c.getFeedbackById);

module.exports = router;
