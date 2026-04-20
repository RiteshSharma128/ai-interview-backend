const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interview.controller');

// Create new session
router.post('/sessions', interviewController.createSession);

// Get all sessions (with pagination)
router.get('/sessions', interviewController.getSessions);

// Get single session
router.get('/sessions/:sessionId', interviewController.getSession);

// Start session
router.patch('/sessions/:sessionId/start', interviewController.startSession);

// Submit answer + get next question
router.post('/sessions/:sessionId/answer', interviewController.submitAnswer);

// Get next question
router.get('/sessions/:sessionId/question', interviewController.getNextQuestion);

// Abandon session
router.patch('/sessions/:sessionId/abandon', interviewController.abandonSession);

module.exports = router;
