const Feedback = require('../models/feedback.model');
const { evaluateSession } = require('../utils/scorer');
const { analyzeVoiceTone } = require('../utils/voiceToneAnalysis');
const logger = require('../config/logger');
const axios = require('axios');

// ─── INTERNAL: Generate feedback (called by interview-service) ─
exports.generateFeedback = async (req, res) => {
  // Internal secret check
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const { sessionId, userId, answers, questions, interviewType, duration } = req.body;

  try {
    // Evaluate all answers
    const evaluation = evaluateSession(answers, questions, interviewType);

    // Voice tone analysis (if audio available or transcript)
    let voiceToneData = null;
    if (answers.some(a => a.audioUrl || a.answerText)) {
      try {
        const combinedTranscript = answers.map(a => a.answerText || '').join(' ');
        voiceToneData = await analyzeVoiceTone({ transcript: combinedTranscript });
      } catch (err) {
        logger.warn('Voice tone analysis skipped:', err.message);
      }
    }

    const feedback = new Feedback({
      sessionId,
      userId,
      interviewType,
      duration,
      overallScore: evaluation.overallScore,
      scores: evaluation.scores,
      answerFeedbacks: evaluation.answerFeedbacks,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      improvementSuggestions: evaluation.improvementSuggestions,
      recommendedTopics: evaluation.recommendedTopics,
      totalFillerWords: evaluation.totalFillerWords,
      avgAnswerLength: evaluation.avgAnswerLength,
      answeredQuestions: evaluation.answeredQuestions,
      totalQuestions: questions.length,
      isAiGenerated: false,
      aiModel: 'rule-based-v1',
      voiceToneAnalysis: voiceToneData || undefined,
    });

    await feedback.save();
    logger.info(`Feedback generated for session ${sessionId}: score=${evaluation.overallScore}`);

    // Notify interview-service to update score
    try {
      await axios.post(`${process.env.INTERVIEW_SERVICE_URL}/api/interviews/internal/update-score`, {
        sessionId,
        overallScore: evaluation.overallScore,
        feedbackId: feedback._id.toString(),
      }, {
        headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET },
        timeout: 3000,
      });
    } catch (e) {
      logger.warn('Could not update interview score:', e.message);
    }

    // Notify analytics-service
    try {
      await axios.post(`${process.env.ANALYTICS_SERVICE_URL}/api/analytics/internal/record-interview`, {
        userId,
        sessionId,
        interviewType,
        overallScore: evaluation.overallScore,
        duration,
      }, {
        headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET },
        timeout: 3000,
      });
    } catch (e) {
      logger.warn('Could not notify analytics:', e.message);
    }

    res.json({ success: true, feedbackId: feedback._id });
  } catch (err) {
    logger.error('Feedback generation error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate feedback' });
  }
};

// ─── GET FEEDBACK BY SESSION ──────────────────────────────────
exports.getFeedbackBySession = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  const feedback = await Feedback.findOne({ sessionId, userId }).lean();
  if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

  res.json({ success: true, feedback });
};

// ─── GET FEEDBACK BY ID ───────────────────────────────────────
exports.getFeedbackById = async (req, res) => {
  const { feedbackId } = req.params;
  const userId = req.user.id;

  const feedback = await Feedback.findOne({ _id: feedbackId, userId }).lean();
  if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });

  res.json({ success: true, feedback });
};

// ─── GET ALL FEEDBACKS (history) ─────────────────────────────
exports.getFeedbackHistory = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [feedbacks, total] = await Promise.all([
    Feedback.find({ userId })
      .select('-answerFeedbacks')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Feedback.countDocuments({ userId }),
  ]);

  res.json({ success: true, feedbacks, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
};

// ─── GET PERFORMANCE TRENDS ───────────────────────────────────
exports.getPerformanceTrends = async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;
  const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const feedbacks = await Feedback.find({ userId, createdAt: { $gte: since } })
    .select('overallScore scores interviewType createdAt')
    .sort({ createdAt: 1 })
    .lean();

  const trends = feedbacks.map(f => ({
    date: f.createdAt,
    overallScore: f.overallScore,
    clarity: f.scores?.clarity,
    communication: f.scores?.communication,
    relevance: f.scores?.relevance,
    interviewType: f.interviewType,
  }));

  res.json({ success: true, trends, period: `${days} days` });
};
