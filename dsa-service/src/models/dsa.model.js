const mongoose = require('mongoose');

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
  explanation: String,
});

const DSAProblemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  category: {
    type: String,
    enum: ['arrays', 'strings', 'linked_list', 'trees', 'graphs', 'dynamic_programming',
           'sorting', 'searching', 'hashing', 'recursion', 'greedy', 'backtracking',
           'bit_manipulation', 'math', 'stack_queue', 'heap', 'trie'],
    required: true,
  },
  tags: [String],
  companies: [String],

  // Code templates per language
  starterCode: {
    javascript: String,
    python: String,
    java: String,
    cpp: String,
  },

  // Solution
  solutionCode: {
    javascript: String,
    python: String,
  },

  testCases: [TestCaseSchema],

  hints: [String],
  explanation: String,

  // Complexity
  timeComplexity: String,
  spaceComplexity: String,

  // Stats
  totalSubmissions: { type: Number, default: 0 },
  acceptedSubmissions: { type: Number, default: 0 },
  acceptanceRate: { type: Number, default: 0 },

  isPremium: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

DSAProblemSchema.index({ difficulty: 1, category: 1 });
DSAProblemSchema.index({ slug: 1 });
DSAProblemSchema.index({ tags: 1 });
DSAProblemSchema.index({ companies: 1 });

const UserSubmissionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'DSAProblem', required: true },
  problemSlug: String,
  language: { type: String, enum: ['javascript', 'python', 'java', 'cpp'] },
  code: { type: String, required: true },
  status: { type: String, enum: ['accepted', 'wrong_answer', 'time_limit', 'runtime_error', 'compile_error'], required: true },
  runtime: Number,   // ms
  memory: Number,    // KB
  testsPassed: Number,
  testsTotal: Number,
  errorMessage: String,
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

UserSubmissionSchema.index({ userId: 1, problemId: 1 });
UserSubmissionSchema.index({ userId: 1, status: 1 });

module.exports = {
  DSAProblem: mongoose.model('DSAProblem', DSAProblemSchema),
  UserSubmission: mongoose.model('UserSubmission', UserSubmissionSchema),
};
