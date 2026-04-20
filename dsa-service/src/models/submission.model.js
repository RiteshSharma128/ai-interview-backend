const mongoose = require('mongoose');
const SubmissionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'DSAProblem', required: true },
  problemSlug: String,
  language: { type: String, enum: ['javascript','python','java','cpp'], required: true },
  code: { type: String, required: true },
  status: { type: String, enum: ['accepted','wrong_answer','time_limit','runtime_error','compile_error','pending'], default: 'pending' },
  testResults: [{ testCase: Number, passed: Boolean, input: String, expected: String, got: String, time: Number }],
  passedCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  executionTime: Number,
  memoryUsed: Number,
  aiHint: String,
  aiExplanation: String,
}, { timestamps: true });
SubmissionSchema.index({ userId: 1, problemId: 1 });
module.exports = mongoose.model('Submission', SubmissionSchema);
