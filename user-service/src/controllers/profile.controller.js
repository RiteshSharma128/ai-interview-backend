const { pool } = require('../config/database');
const { getRedis } = require('../config/redis');
const { uploadToCloudinary } = require('../middleware/upload');
const logger = require('../config/logger');

exports.getProfile = async (req, res) => {
  const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [req.user.id]);
  if (!result.rows.length) {
    await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [req.user.id]);
    return res.json({ success: true, profile: { user_id: req.user.id } });
  }
  res.json({ success: true, profile: result.rows[0] });
};

exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { bio, linkedinUrl, githubUrl, portfolioUrl, location, college, company, graduationYear, phone } = req.body;

  const result = await pool.query(`
    INSERT INTO user_profiles (user_id, bio, linkedin_url, github_url, portfolio_url, location, college, company, graduation_year, phone, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      bio=EXCLUDED.bio, linkedin_url=EXCLUDED.linkedin_url, github_url=EXCLUDED.github_url,
      portfolio_url=EXCLUDED.portfolio_url, location=EXCLUDED.location, college=EXCLUDED.college,
      company=EXCLUDED.company, graduation_year=EXCLUDED.graduation_year, phone=EXCLUDED.phone, updated_at=NOW()
    RETURNING *
  `, [userId, bio, linkedinUrl, githubUrl, portfolioUrl, location, college, company, graduationYear, phone]);

  try { const redis = getRedis(); await redis.del(`user:${userId}`); } catch {}

  res.json({ success: true, profile: result.rows[0] });
};

exports.uploadResume = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const userId = req.user.id;
  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'resumes',
      resource_type: 'raw',
      public_id: `resume_${userId}_${Date.now()}`,
    });

    const resumeParsed = {
      fileName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      url: result.secure_url,
    };

    await pool.query(
      'UPDATE user_profiles SET resume_url=$1, resume_parsed=$2, updated_at=NOW() WHERE user_id=$3',
      [result.secure_url, JSON.stringify(resumeParsed), userId]
    );

    try { const redis = getRedis(); await redis.del(`user:${userId}`); } catch {}

    res.json({ success: true, resumeUrl: result.secure_url });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
};

exports.deleteResume = async (req, res) => {
  await pool.query("UPDATE user_profiles SET resume_url=NULL, resume_parsed='{}', updated_at=NOW() WHERE user_id=$1", [req.user.id]);
  res.json({ success: true, message: 'Resume deleted' });
};
