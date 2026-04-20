const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/community.controller');
const { authenticate } = require('../middleware/auth');

router.get('/posts', ctrl.getPosts);
router.get('/posts/:id', ctrl.getPost);
router.post('/posts', authenticate, ctrl.createPost);
router.post('/posts/:id/upvote', authenticate, ctrl.upvotePost);
router.post('/posts/:id/comments', authenticate, ctrl.addComment);
router.delete('/posts/:id', authenticate, ctrl.deletePost);
module.exports = router;
