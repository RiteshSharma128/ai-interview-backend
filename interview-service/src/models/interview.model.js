const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['behavioral','technical','hr','coding','system_design'], default: 'behavioral' },
  difficulty: { type: String, enum: ['easy','medium','hard'], default: 'medium' },
  category: String,
  followUps: [String],
  expectedKeyPoints: [String],
  order: Number,
});

const AnswerSchema = new mongoose.Schema({
  questionId: String,
  questionText: String,
  answerText: String,
  audioUrl: String,
  videoUrl: String,
  timeTaken: Number,
  wordCount: Number,
  fillerWords: [String],
  submittedAt: { type: Date, default: Date.now },
});

const InterviewSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'Mock Interview' },
  interviewType: {
    type: String,
    enum: ['sde','hr','product_manager','data_analyst','full_stack','system_design','behavioral','custom'],
    default: 'sde',
  },
  mode: { type: String, enum: ['text','voice','video','whiteboard'], default: 'text' },
  difficulty: { type: String, enum: ['easy','medium','hard'], default: 'medium' },
  targetCompany: String,
  targetRole: String,
  resumeBased: { type: Boolean, default: false },
  totalQuestions: { type: Number, default: 5 },
  timeLimit: { type: Number, default: 60 },
  questions: [QuestionSchema],
  answers: [AnswerSchema],
  status: {
    type: String,
    enum: ['pending','in_progress','completed','abandoned'],
    default: 'pending',
  },
  currentQuestionIndex: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date,
  duration: Number,
  overallScore: { type: Number, min: 0, max: 100 },
  feedbackId: String,
  tags: [String],
  notes: String,
}, { timestamps: true });

InterviewSessionSchema.index({ userId: 1, createdAt: -1 });
InterviewSessionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
