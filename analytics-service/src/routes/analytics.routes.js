const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analytics.controller');

router.post('/internal/record-interview', ctrl.recordInterviewCompleted);
router.post('/internal/record-dsa', ctrl.recordProblemSolved);
router.get('/dashboard', ctrl.getDashboard);
router.get('/trends', ctrl.getPerformanceTrends);
router.get('/skills', ctrl.getSkillBreakdown);
router.get('/heatmap', ctrl.getActivityHeatmap);

module.exports = router;
