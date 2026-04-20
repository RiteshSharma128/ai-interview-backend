const express = require('express'); const router = express.Router();
const c = require('../controllers/admin.controller');
router.get('/stats', c.getStats);
router.get('/users', c.getUsers);
router.patch('/users/:userId/toggle-active', c.toggleUserActive);
router.post('/jobs', c.addJob);
router.delete('/jobs/:jobId', c.deleteJob);
module.exports = router;
