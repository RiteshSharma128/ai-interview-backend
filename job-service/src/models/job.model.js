const mongoose = require('mongoose');

const savedJobSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  jobId: { type: String, required: true },
  title: String,
  company: String,
  savedAt: { type: Date, default: Date.now },
});

const SavedJob = mongoose.model('SavedJob', savedJobSchema);
module.exports = { SavedJob };
