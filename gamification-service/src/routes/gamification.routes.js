const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/gamification.controller');

router.get('/me', ctrl.getStats);
router.get('/leaderboard', ctrl.getLeaderboard);
router.get('/badges', ctrl.getBadges);
router.post('/xp', ctrl.addXP);
router.post('/streak', ctrl.updateStreak);

module.exports = router;
