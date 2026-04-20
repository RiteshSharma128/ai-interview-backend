// const { v4: uuidv4 } = require('uuid');
// const InterviewSession = require('../models/interview.model');
// const logger = require('../config/logger');
// const { getQuestionsByType } = require('../utils/questionBank');
// const axios = require('axios');

// // ─── CREATE SESSION ───────────────────────────────────────────
// exports.createSession = async (req, res) => {
//   const userId = req.user.id;
//   const {
//     interviewType = 'sde',
//     mode = 'text',
//     difficulty = 'medium',
//     targetCompany,
//     targetRole,
//     resumeBased = false,
//     totalQuestions = 5,
//     timeLimit = 60,
//   } = req.body;

//   // Generate questions
//   const questions = await getQuestionsByType({
//     interviewType, difficulty, targetCompany,
//     totalQuestions, resumeBased, userId,
//   });

//   const session = new InterviewSession({
//     userId,
//     title: `${interviewType.toUpperCase()} Interview - ${new Date().toLocaleDateString()}`,
//     interviewType,
//     mode,
//     difficulty,
//     targetCompany,
//     targetRole,
//     resumeBased,
//     totalQuestions: questions.length,
//     timeLimit,
//     questions,
//     status: 'pending',
//   });

//   await session.save();
//   logger.info(`Interview session created: ${session._id} for user: ${userId}`);

//   res.status(201).json({
//     success: true,
//     session: {
//       id: session._id,
//       title: session.title,
//       interviewType: session.interviewType,
//       mode: session.mode,
//       difficulty: session.difficulty,
//       totalQuestions: session.totalQuestions,
//       timeLimit: session.timeLimit,
//       status: session.status,
//       firstQuestion: session.questions[0],
//     },
//   });
// };

// // ─── START SESSION ────────────────────────────────────────────
// exports.startSession = async (req, res) => {
//   const { sessionId } = req.params;
//   const userId = req.user.id;

//   const session = await InterviewSession.findOne({ _id: sessionId, userId });
//   if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
//   if (session.status === 'completed') {
//     return res.status(400).json({ success: false, message: 'Session already completed' });
//   }

//   session.status = 'in_progress';
//   session.startedAt = new Date();
//   await session.save();

//   res.json({
//     success: true,
//     session: {
//       id: session._id,
//       status: session.status,
//       currentQuestion: session.questions[session.currentQuestionIndex],
//       currentQuestionIndex: session.currentQuestionIndex,
//       totalQuestions: session.totalQuestions,
//       startedAt: session.startedAt,
//     },
//   });
// };

// // ─── SUBMIT ANSWER ────────────────────────────────────────────
// exports.submitAnswer = async (req, res) => {
//   const { sessionId } = req.params;
//   const userId = req.user.id;
//   const { answerText, timeTaken, audioUrl, videoUrl } = req.body;

//   const session = await InterviewSession.findOne({ _id: sessionId, userId });
//   if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
//   if (session.status !== 'in_progress') {
//     return res.status(400).json({ success: false, message: 'Session is not in progress' });
//   }

//   const currentQ = session.questions[session.currentQuestionIndex];
//   if (!currentQ) return res.status(400).json({ success: false, message: 'No current question' });

//   // Detect filler words
//   const fillerWords = detectFillerWords(answerText || '');
//   const wordCount = (answerText || '').trim().split(/\s+/).filter(Boolean).length;

//   // Save answer
//   session.answers.push({
//     questionId: currentQ.questionId,
//     questionText: currentQ.text,
//     answerText,
//     audioUrl,
//     videoUrl,
//     timeTaken,
//     wordCount,
//     fillerWords,
//   });

//   // Move to next question
//   session.currentQuestionIndex += 1;

//   // Check if all questions answered
//   const isCompleted = session.currentQuestionIndex >= session.questions.length;

//   if (isCompleted) {
//     session.status = 'completed';
//     session.completedAt = new Date();
//     session.duration = session.startedAt
//       ? Math.floor((session.completedAt - session.startedAt) / 1000)
//       : 0;
//   }

//   await session.save();

//   // Trigger feedback generation async (fire and forget)
//   if (isCompleted) {
//     triggerFeedbackGeneration(session, userId);
//   }

//   res.json({
//     success: true,
//     isCompleted,
//     nextQuestion: isCompleted ? null : session.questions[session.currentQuestionIndex],
//     currentQuestionIndex: session.currentQuestionIndex,
//     remainingQuestions: session.questions.length - session.currentQuestionIndex,
//   });
// };

// // ─── GET SESSION ──────────────────────────────────────────────
// exports.getSession = async (req, res) => {
//   const { sessionId } = req.params;
//   const userId = req.user.id;

//   const session = await InterviewSession.findOne({ _id: sessionId, userId }).lean();
//   if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

//   res.json({ success: true, session });
// };

// // ─── GET ALL SESSIONS ────────────────────────────────────────
// exports.getSessions = async (req, res) => {
//   const userId = req.user.id;
//   const { page = 1, limit = 10, status, interviewType } = req.query;

//   const filter = { userId };
//   if (status) filter.status = status;
//   if (interviewType) filter.interviewType = interviewType;

//   const skip = (parseInt(page) - 1) * parseInt(limit);

//   const [sessions, total] = await Promise.all([
//     InterviewSession.find(filter)
//       .select('-questions -answers')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(parseInt(limit))
//       .lean(),
//     InterviewSession.countDocuments(filter),
//   ]);

//   res.json({
//     success: true,
//     sessions,
//     pagination: {
//       page: parseInt(page),
//       limit: parseInt(limit),
//       total,
//       pages: Math.ceil(total / parseInt(limit)),
//     },
//   });
// };

// // ─── ABANDON SESSION ─────────────────────────────────────────
// exports.abandonSession = async (req, res) => {
//   const { sessionId } = req.params;
//   const userId = req.user.id;

//   await InterviewSession.findOneAndUpdate(
//     { _id: sessionId, userId },
//     { status: 'abandoned', completedAt: new Date() }
//   );

//   res.json({ success: true, message: 'Session abandoned' });
// };

// // ─── GET NEXT QUESTION ────────────────────────────────────────
// exports.getNextQuestion = async (req, res) => {
//   const { sessionId } = req.params;
//   const userId = req.user.id;

//   const session = await InterviewSession.findOne({ _id: sessionId, userId });
//   if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

//   const question = session.questions[session.currentQuestionIndex];
//   if (!question) return res.json({ success: true, question: null, isComplete: true });

//   res.json({
//     success: true,
//     question,
//     questionNumber: session.currentQuestionIndex + 1,
//     totalQuestions: session.totalQuestions,
//     isComplete: false,
//   });
// };

// // ─── HELPERS ─────────────────────────────────────────────────
// const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right', 'okay'];

// const detectFillerWords = (text) => {
//   const lower = text.toLowerCase();
//   return FILLER_WORDS.filter(word => {
//     const regex = new RegExp(`\\b${word}\\b`, 'g');
//     return regex.test(lower);
//   });
// };

// const triggerFeedbackGeneration = async (session, userId) => {
//   try {
//     await axios.post(`${process.env.FEEDBACK_SERVICE_URL}/api/feedback/internal/generate`, {
//       sessionId: session._id.toString(),
//       userId,
//       answers: session.answers,
//       questions: session.questions,
//       interviewType: session.interviewType,
//       duration: session.duration,
//     }, {
//       headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET },
//       timeout: 5000,
//     });
//   } catch (err) {
//     logger.warn(`Could not trigger feedback for session ${session._id}: ${err.message}`);
//   }
// };




const { v4: uuidv4 } = require('uuid');
const InterviewSession = require('../models/interview.model');
const logger = require('../config/logger');
const { getQuestionsByType } = require('../utils/questionBank');
const axios = require('axios');
const { Pool } = require('pg');

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

exports.createSession = async (req, res) => {
  const userId = req.user.id;
  const {
    interviewType = 'sde', mode = 'text', difficulty = 'medium',
    targetCompany, targetRole, resumeBased = false,
    totalQuestions = 5, timeLimit = 60,
  } = req.body;

  const questions = await getQuestionsByType({
    interviewType, difficulty, targetCompany,
    totalQuestions, resumeBased, userId,
  });

  const session = new InterviewSession({
    userId,
    title: `${interviewType.toUpperCase()} Interview - ${new Date().toLocaleDateString()}`,
    interviewType, mode, difficulty, targetCompany, targetRole,
    resumeBased, totalQuestions: questions.length, timeLimit,
    questions, status: 'pending',
  });

  await session.save();
  logger.info(`Interview session created: ${session._id} for user: ${userId}`);

  res.status(201).json({
    success: true,
    session: {
      id: session._id, title: session.title, interviewType: session.interviewType,
      mode: session.mode, difficulty: session.difficulty,
      totalQuestions: session.totalQuestions, timeLimit: session.timeLimit,
      status: session.status, firstQuestion: session.questions[0],
    },
  });
};

exports.startSession = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  const session = await InterviewSession.findOne({ _id: sessionId, userId });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status === 'completed') return res.status(400).json({ success: false, message: 'Session already completed' });

  session.status = 'in_progress';
  session.startedAt = new Date();
  await session.save();

  res.json({
    success: true,
    session: {
      id: session._id, status: session.status,
      currentQuestion: session.questions[session.currentQuestionIndex],
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.totalQuestions, startedAt: session.startedAt,
    },
  });
};

exports.submitAnswer = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const { answerText, timeTaken, audioUrl, videoUrl } = req.body;

  const session = await InterviewSession.findOne({ _id: sessionId, userId });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.status !== 'in_progress') return res.status(400).json({ success: false, message: 'Session is not in progress' });

  const currentQ = session.questions[session.currentQuestionIndex];
  if (!currentQ) return res.status(400).json({ success: false, message: 'No current question' });

  const fillerWords = detectFillerWords(answerText || '');
  const wordCount = (answerText || '').trim().split(/\s+/).filter(Boolean).length;

  session.answers.push({
    questionId: currentQ.questionId, questionText: currentQ.text,
    answerText, audioUrl, videoUrl, timeTaken, wordCount, fillerWords,
  });

  session.currentQuestionIndex += 1;
  const isCompleted = session.currentQuestionIndex >= session.questions.length;

  if (isCompleted) {
    session.status = 'completed';
    session.completedAt = new Date();
    session.duration = session.startedAt
      ? Math.floor((session.completedAt - session.startedAt) / 1000) : 0;
  }

  await session.save();

  if (isCompleted) {
    triggerFeedbackGeneration(session, userId);

    const today = new Date().toISOString().split('T')[0];

    pgPool.query(`
      INSERT INTO analytics_daily (user_id, date, interviews_done, xp_earned)
      VALUES ($1, $2, 1, 100)
      ON CONFLICT (user_id, date) DO UPDATE SET
        interviews_done = analytics_daily.interviews_done + 1,
        xp_earned = analytics_daily.xp_earned + 100
    `, [userId, today]).catch(e => logger.warn('analytics update failed: ' + e.message));

    pgPool.query(`
      UPDATE user_gamification SET
        total_interviews = total_interviews + 1,
        xp_points = xp_points + 100,
        last_activity_date = CURRENT_DATE,
        current_streak = CASE
          WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
          WHEN last_activity_date = CURRENT_DATE THEN current_streak
          ELSE 1
        END,
        longest_streak = GREATEST(longest_streak, CASE
          WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
          WHEN last_activity_date = CURRENT_DATE THEN current_streak
          ELSE 1
        END)
      WHERE user_id = $1
    `, [userId]).catch(e => logger.warn('gamification update failed: ' + e.message));
  }

  res.json({
    success: true, isCompleted,
    nextQuestion: isCompleted ? null : session.questions[session.currentQuestionIndex],
    currentQuestionIndex: session.currentQuestionIndex,
    remainingQuestions: session.questions.length - session.currentQuestionIndex,
  });
};

exports.getSession = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const session = await InterviewSession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, session });
};

exports.getSessions = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status, interviewType } = req.query;
  const filter = { userId };
  if (status) filter.status = status;
  if (interviewType) filter.interviewType = interviewType;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [sessions, total] = await Promise.all([
    InterviewSession.find(filter).select('-questions -answers')
      .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    InterviewSession.countDocuments(filter),
  ]);
  res.json({
    success: true, sessions,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
};

exports.abandonSession = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  await InterviewSession.findOneAndUpdate(
    { _id: sessionId, userId },
    { status: 'abandoned', completedAt: new Date() }
  );
  res.json({ success: true, message: 'Session abandoned' });
};

exports.getNextQuestion = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const session = await InterviewSession.findOne({ _id: sessionId, userId });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  const question = session.questions[session.currentQuestionIndex];
  if (!question) return res.json({ success: true, question: null, isComplete: true });
  res.json({
    success: true, question,
    questionNumber: session.currentQuestionIndex + 1,
    totalQuestions: session.totalQuestions, isComplete: false,
  });
};

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right', 'okay'];

const detectFillerWords = (text) => {
  const lower = text.toLowerCase();
  return FILLER_WORDS.filter(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    return regex.test(lower);
  });
};

const triggerFeedbackGeneration = async (session, userId) => {
  try {
    await axios.post(`${process.env.FEEDBACK_SERVICE_URL}/api/feedback/internal/generate`, {
      sessionId: session._id.toString(), userId,
      answers: session.answers, questions: session.questions,
      interviewType: session.interviewType, duration: session.duration,
    }, { headers: { 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET }, timeout: 15000 });
  } catch (err) {
    logger.warn(`Could not trigger feedback for session ${session._id}: ${err.message}`);
  }
};