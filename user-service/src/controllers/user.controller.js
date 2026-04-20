const { pool } = require('../config/database');
const { getRedis } = require('../config/redis');
const cloudinary = require('../config/cloudinary');
const { uploadToCloudinary } = require('../middleware/upload');
const { validationResult } = require('express-validator');
const logger = require('../config/logger');

exports.getMe = async (req, res) => {
  const userId = req.user.id;
  const redis = getRedis();

  const cacheKey = `user:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ success: true, user: JSON.parse(cached) });
  } catch {}

  const result = await pool.query(`
    SELECT u.id, u.email, u.name, u.role, u.user_type, u.is_verified,
      u.avatar_url, u.target_role, u.skills, u.experience_years, u.created_at,
      p.bio, p.linkedin_url, p.github_url, p.portfolio_url, p.resume_url,
      p.location, p.college, p.company, p.graduation_year, p.phone,
      g.xp_points, g.level, g.level_name, g.current_streak, g.total_interviews,
      g.total_problems_solved
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    LEFT JOIN user_gamification g ON g.user_id = u.id
    WHERE u.id = $1
  `, [userId]);

  if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });

  const user = result.rows[0];
  try { await redis.setex(cacheKey, 300, JSON.stringify(user)); } catch {}

  res.json({ success: true, user });
};

exports.updateMe = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const userId = req.user.id;
  const { name, targetRole, skills, userType, experienceYears } = req.body;

  const updates = []; const values = []; let idx = 1;
  if (name)                    { updates.push(`name = $${idx++}`);             values.push(name); }
  if (targetRole !== undefined){ updates.push(`target_role = $${idx++}`);       values.push(targetRole); }
  if (skills)                  { updates.push(`skills = $${idx++}`);            values.push(skills); }
  if (userType)                { updates.push(`user_type = $${idx++}`);         values.push(userType); }
  if (experienceYears !== undefined){ updates.push(`experience_years = $${idx++}`); values.push(experienceYears); }

  if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });

  updates.push('updated_at = NOW()');
  values.push(userId);

  const result = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, role, user_type, target_role, skills`,
    values
  );

  try { const redis = getRedis(); await redis.del(`user:${userId}`); } catch {}

  res.json({ success: true, message: 'Updated', user: result.rows[0] });
};

exports.uploadAvatar = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const userId = req.user.id;
  try {
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'avatars',
      transformation: [{ width: 400, height: 400, crop: 'fill' }],
      public_id: `avatar_${userId}`,
    });

    await pool.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [result.secure_url, userId]);
    try { const redis = getRedis(); await redis.del(`user:${userId}`); } catch {}

    res.json({ success: true, avatarUrl: result.secure_url });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.user.id]);
  try { const redis = getRedis(); await redis.del(`user:${req.user.id}`); } catch {}
  res.json({ success: true, message: 'Account deactivated' });
};

exports.getUserById = async (req, res) => {
  const result = await pool.query(`
    SELECT u.id, u.name, u.avatar_url, u.target_role, u.skills,
      g.xp_points, g.level, g.level_name, g.current_streak,
      g.total_interviews, g.total_problems_solved,
      p.bio, p.linkedin_url, p.github_url, p.college, p.company
    FROM users u
    LEFT JOIN user_profiles p ON p.user_id = u.id
    LEFT JOIN user_gamification g ON g.user_id = u.id
    WHERE u.id = $1 AND u.is_active = true
  `, [req.params.userId]);

  if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: result.rows[0] });
};

exports.getLeaderboard = async (req, res) => {
  const { period = 'all_time', limit = 20 } = req.query;
  const column = period === 'weekly' ? 'weekly_xp' : period === 'monthly' ? 'monthly_xp' : 'all_time_xp';
  const result = await pool.query(`
    SELECT u.id, u.name, u.avatar_url, u.target_role,
      l.${column} as xp, l.rank,
      g.level, g.level_name, g.current_streak
    FROM leaderboard l
    JOIN users u ON u.id = l.user_id
    JOIN user_gamification g ON g.user_id = l.user_id
    WHERE u.is_active = true
    ORDER BY l.${column} DESC
    LIMIT $1
  `, [parseInt(limit)]);
  res.json({ success: true, leaderboard: result.rows, period });
};
