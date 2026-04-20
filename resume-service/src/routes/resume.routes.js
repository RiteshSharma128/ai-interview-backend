const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/resume.controller');
router.get('/', ctrl.getResume);
router.post('/', ctrl.saveResume);
router.post('/ats-check', ctrl.getAtsScore);
router.post('/cover-letter', ctrl.generateCoverLetter);
router.post('/jd-match', ctrl.matchJobDescription);
module.exports = router;

router.post('/ai-analyze', async (req, res) => {
  try {
    const { analyzeResumeStrength } = require('../utils/resumeAIAnalysis');
    const { Resume } = require('../models/resume.model');
    const resume = await Resume.findOne({ userId: req.user.id }).lean();
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found. Please save your resume first.' });
    const analysis = await analyzeResumeStrength(resume);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
