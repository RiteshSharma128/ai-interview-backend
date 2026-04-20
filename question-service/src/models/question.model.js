const mongoose = require('mongoose');
const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['behavioral','technical','hr','coding','system_design'], required: true },
  category: { type: String, required: true },
  difficulty: { type: String, enum: ['easy','medium','hard'], default: 'medium' },
  interviewType: { type: String, enum: ['sde','hr','product_manager','data_analyst','full_stack','general'], default: 'general' },
  tags: [String],
  companies: [String],
  expectedAnswer: String,
  keyPoints: [String],
  followUps: [String],
  isActive: { type: Boolean, default: true },
  createdBy: String,
  views: { type: Number, default: 0 },
  upvotes: { type: Number, default: 0 },
}, { timestamps: true });
QuestionSchema.index({ type:1, difficulty:1, interviewType:1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ companies: 1 });
QuestionSchema.index({ text:'text' });
module.exports = mongoose.model('Question', QuestionSchema);
