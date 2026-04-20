const mongoose = require('mongoose');

const AnswerFeedbackSchema = new mongoose.Schema({
  questionId: String,
  questionText: String,
  userAnswer: String,
  scores: {
    clarity: { type: Number, min: 0, max: 100 },
    relevance: { type: Number, min: 0, max: 100 },
    depth: { type: Number, min: 0, max: 100 },
    communication: { type: Number, min: 0, max: 100 },
    starMethod: { type: Number, min: 0, max: 100 },
    overall: { type: Number, min: 0, max: 100 },
  },
  strengths: [String],
  improvements: [String],
  idealAnswer: String,
  fillerWordsDetected: [String],
  fillerWordCount: { type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },
  sentimentScore: Number,
  starMethodBreakdown: {
    situation: Boolean,
    task: Boolean,
    action: Boolean,
    result: Boolean,
    score: Number,
  },
});

const VoiceToneSchema = new mongoose.Schema({
  provider: String,
  sentimentOverall: String,
  sentimentScore: Number,
  toneAnalysis: {
    confidence: Number,
    pace: Number,
    clarity: Number,
  },
  topics: [String],
  setupNote: String,
}, { _id: false });

const FeedbackSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  interviewType: String,
  duration: Number,
  overallScore: { type: Number, min: 0, max: 100 },
  scores: {
    clarity: Number,
    confidence: Number,
    relevance: Number,
    communication: Number,
    technicalDepth: Number,
    starMethod: Number,
  },
  answerFeedbacks: [AnswerFeedbackSchema],
  strengths: [String],
  weaknesses: [String],
  improvementSuggestions: [String],
  recommendedTopics: [String],
  totalFillerWords: { type: Number, default: 0 },
  avgAnswerLength: Number,
  answeredQuestions: Number,
  totalQuestions: Number,
  voiceToneAnalysis: VoiceToneSchema,
  isAiGenerated: { type: Boolean, default: false },
  aiModel: String,
}, { timestamps: true });

FeedbackSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
