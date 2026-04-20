const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const profileController = require('../controllers/profile.controller');
const { uploadResume } = require('../middleware/upload');

router.get('/', profileController.getProfile);

router.put('/',
  [
    body('bio').optional().trim().isLength({ max: 500 }),
    body('linkedinUrl').optional().isURL(),
    body('githubUrl').optional().isURL(),
    body('portfolioUrl').optional().isURL(),
    body('location').optional().trim(),
    body('college').optional().trim(),
    body('company').optional().trim(),
    body('graduationYear').optional().isInt({ min: 1990, max: 2030 }),
    body('phone').optional().trim(),
  ],
  profileController.updateProfile
);

// Resume upload
router.post('/resume', uploadResume, profileController.uploadResume);
router.delete('/resume', profileController.deleteResume);

module.exports = router;
