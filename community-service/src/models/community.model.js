const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: String,
  userAvatar: String,
  content: { type: String, required: true },
  upvotes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const PostSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userName: String,
  userAvatar: String,
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['experience','doubt','discussion','resource','job_ref'], default: 'discussion' },
  tags: [String],
  comments: [CommentSchema],
  upvotes: { type: Number, default: 0 },
  upvotedBy: [String],
  views: { type: Number, default: 0 },
  isPinned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

PostSchema.index({ category:1, createdAt:-1 });
PostSchema.index({ tags:1 });
PostSchema.index({ title:'text', content:'text' });

module.exports = { Post: mongoose.model('Post', PostSchema) };
