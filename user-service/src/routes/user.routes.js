// const express = require('express');
// const router = express.Router();
// const { body } = require('express-validator');
// const userController = require('../controllers/user.controller');
// const { uploadAvatar } = require('../middleware/upload');

// // GET current user
// router.get('/me', userController.getMe);

// // UPDATE user basic info
// router.patch('/me',
//   [
//     body('name').optional().trim().isLength({ min: 2 }),
//     body('targetRole').optional().trim(),
//     body('skills').optional().isArray(),
//     body('userType').optional().isIn(['student', 'professional']),
//   ],
//   userController.updateMe
// );

// // UPLOAD avatar
// router.post('/me/avatar', uploadAvatar, userController.uploadAvatar);

// // DELETE account
// router.delete('/me', userController.deleteAccount);

// // GET public user by ID
// router.get('/:userId', userController.getUserById);

// // GET leaderboard
// router.get('/leaderboard/top', userController.getLeaderboard);


// module.exports = router;



// const express = require('express');
// const router = express.Router();
// const { body } = require('express-validator');
// const userController = require('../controllers/user.controller');
// const { uploadAvatar } = require('../middleware/upload');

// router.get('/me', userController.getMe);
// router.patch('/me', [
//   body('name').optional().trim().isLength({ min: 2 }),
//   body('targetRole').optional().trim(),
//   body('skills').optional().isArray(),
//   body('userType').optional().isIn(['student', 'professional']),
// ], userController.updateMe);
// router.post('/me/avatar', uploadAvatar, userController.uploadAvatar);
// router.delete('/me', userController.deleteAccount);
// router.get('/leaderboard/top', userController.getLeaderboard);
// router.get('/:userId', userController.getUserById);
// module.exports = router;




const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const userController = require('../controllers/user.controller');
const { uploadAvatar } = require('../middleware/upload');

// ================== AUTH USER ==================
router.get('/me', userController.getMe);

router.patch('/me', [
  body('name').optional().trim().isLength({ min: 2 }),
  body('targetRole').optional().trim(),
  body('skills').optional().isArray(),
  body('userType').optional().isIn(['student', 'professional']),
], userController.updateMe);

router.post('/me/avatar', uploadAvatar, userController.uploadAvatar);

router.delete('/me', userController.deleteAccount);

// ================== OTHER ==================
router.get('/leaderboard/top', userController.getLeaderboard);

// ================== SAFE USER FETCH ==================
// ✅ Clean + Safe route (no conflict like /profile)
router.get('/id/:userId',
  param('userId').isUUID().withMessage('Invalid user ID'),
  userController.getUserById
);

module.exports = router;