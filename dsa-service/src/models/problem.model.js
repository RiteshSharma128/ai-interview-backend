const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['easy','medium','hard'], required: true },
  category: { type: String, enum: ['array','string','tree','graph','dp','linkedlist','stack','queue','heap','greedy','binary-search','math','bit-manipulation'], required: true },
  tags: [String],
  constraints: String,
  examples: [{ input: String, output: String, explanation: String }],
  testCases: {
    visible: [{ input: String, expectedOutput: String }],
    hidden: [{ input: String, expectedOutput: String }],
  },
  starterCode: {
    javascript: String,
    python: String,
    java: String,
    cpp: String,
  },
  solution: {
    javascript: String,
    python: String,
  },
  hints: [String],
  timeComplexity: String,
  spaceComplexity: String,
  aiExplanation: String,
  companies: [String],
  acceptanceRate: { type: Number, default: 0 },
  totalSubmissions: { type: Number, default: 0 },
  totalAccepted: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const submissionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  code: { type: String, required: true },
  language: { type: String, enum: ['javascript','python','java','cpp'], required: true },
  status: { type: String, enum: ['accepted','wrong_answer','time_limit','runtime_error','compile_error'], required: true },
  runtime: Number,
  memory: Number,
  passedTestCases: Number,
  totalTestCases: Number,
  errorMessage: String,
}, { timestamps: true });

const Problem = mongoose.model('Problem', problemSchema);
const Submission = mongoose.model('Submission', submissionSchema);
module.exports = { Problem, Submission };
