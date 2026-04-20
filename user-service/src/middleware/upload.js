const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Use memory storage - upload to cloudinary manually
const storage = multer.memoryStorage();

const fileFilter = (allowed) => (req, file, cb) => {
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

// Upload to Cloudinary directly
const uploadToCloudinary = async (buffer, options) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    }).end(buffer);
  });
};

exports.uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
}).single('avatar');

exports.uploadResume = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
}).single('resume');

exports.uploadToCloudinary = uploadToCloudinary;
