const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const {
  generateTokens, saveRefreshToken, verifyRefreshToken,
  revokeRefreshToken, blacklistAccessToken, setCookies, clearCookies,
} = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const logger = require('../config/logger');

const register = async (req, res) => {
  const { name, email, password, userType = 'student', targetRole } = req.body;
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  const userResult = await pool.query(`
    INSERT INTO users (name, email, password_hash, user_type, target_role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, role, user_type, is_verified, created_at
  `, [name, email, passwordHash, userType, targetRole || null]);
  const user = userResult.rows[0];
  await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [user.id]);
  await pool.query('INSERT INTO user_gamification (user_id) VALUES ($1)', [user.id]);
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query('INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, verifyToken, verifyExpires]);
  sendVerificationEmail(email, name, verifyToken);
  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user.id, refreshToken);
  setCookies(res, accessToken, refreshToken);
  res.status(201).json({
    success: true,
    message: 'Registration successful! Please verify your email.',
    user: { id: user.id, name: user.name, email: user.email, role: user.role, userType: user.user_type, isVerified: user.is_verified },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query(`
    SELECT u.*, up.resume_url, ug.xp_points, ug.level, ug.level_name, ug.current_streak
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN user_gamification ug ON ug.user_id = u.id
    WHERE u.email = $1 AND u.is_active = true
  `, [email]);
  if (!result.rows.length) return res.status(401).json({ success: false, message: 'Invalid email or password' });
  const user = result.rows[0];
  if (!user.password_hash) return res.status(401).json({ success: false, message: `Please login with ${user.oauth_provider || 'OAuth'}` });
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });
  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user.id, refreshToken);
  setCookies(res, accessToken, refreshToken);
  res.json({
    success: true, message: 'Login successful',
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      userType: user.user_type, isVerified: user.is_verified, avatarUrl: user.avatar_url,
      targetRole: user.target_role, xpPoints: user.xp_points, level: user.level,
      levelName: user.level_name, currentStreak: user.current_streak,
    },
  });
};

const logout = async (req, res) => {
  const accessToken = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
  const refreshToken = req.cookies?.refresh_token;
  if (accessToken) await blacklistAccessToken(accessToken);
  if (refreshToken) await revokeRefreshToken(refreshToken);
  clearCookies(res);
  res.json({ success: true, message: 'Logged out successfully' });
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });
  try {
    const decoded = await verifyRefreshToken(refreshToken);
    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', [decoded.id]);
    if (!result.rows.length) return res.status(401).json({ success: false, message: 'User not found' });
    const user = result.rows[0];
    await revokeRefreshToken(refreshToken);
    const { accessToken: newAccess, refreshToken: newRefresh } = generateTokens(user);
    await saveRefreshToken(user.id, newRefresh);
    setCookies(res, newAccess, newRefresh);
    res.json({ success: true, message: 'Token refreshed' });
  } catch (err) {
    clearCookies(res);
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

const me = async (req, res) => {
  const result = await pool.query(`
    SELECT u.id, u.name, u.email, u.role, u.user_type, u.is_verified, u.avatar_url,
      u.target_role, u.experience_years, u.skills, u.created_at,
      up.bio, up.linkedin_url, up.github_url, up.portfolio_url, up.resume_url,
      up.college, up.company, up.graduation_year, up.location,
      ug.xp_points, ug.level, ug.level_name, ug.current_streak, ug.longest_streak,
      ug.total_interviews, ug.total_problems_solved
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN user_gamification ug ON ug.user_id = u.id
    WHERE u.id = $1 AND u.is_active = true
  `, [req.user.id]);
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: result.rows[0] });
};

const verifyEmail = async (req, res) => {
  const { token } = req.params;
  const result = await pool.query(
    'SELECT * FROM email_verifications WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()', [token]);
  if (!result.rows.length) return res.status(400).json({ success: false, message: 'Invalid or expired link' });
  const verification = result.rows[0];
  await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [verification.user_id]);
  await pool.query('UPDATE email_verifications SET used_at = NOW() WHERE id = $1', [verification.id]);
  res.json({ success: true, message: 'Email verified successfully!' });
};

const resendVerification = async (req, res) => {
  const { email } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_verified = false', [email]);
  if (!result.rows.length) return res.json({ success: true, message: 'If email exists and is unverified, a link has been sent.' });
  const user = result.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query('INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expires]);
  sendVerificationEmail(email, user.name, token);
  res.json({ success: true, message: 'Verification email sent!' });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!result.rows.length) return res.json({ success: true, message: 'If this email is registered, you will receive a reset link.' });
  const user = result.rows[0];
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.id, tokenHash, expires]);
  sendPasswordResetEmail(email, user.name, resetToken);
  res.json({ success: true, message: 'If this email is registered, you will receive a reset link.' });
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await pool.query(
    'SELECT * FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()', [tokenHash]);
  if (!result.rows.length) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  const reset = result.rows[0];
  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, reset.user_id]);
  await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [reset.id]);
  await pool.query('UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1', [reset.user_id]);
  res.json({ success: true, message: 'Password reset successful! Please login.' });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  if (!user.password_hash) return res.status(400).json({ success: false, message: 'OAuth accounts cannot change password' });
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  const newHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
  res.json({ success: true, message: 'Password changed successfully' });
};

const oauthCallback = async (req, res) => {
  const user = req.user;
  const { accessToken, refreshToken } = generateTokens(user);
  await saveRefreshToken(user.id, refreshToken);
  setCookies(res, accessToken, refreshToken);
  res.redirect(`${process.env.FRONTEND_URL}/dashboard?oauth=success`);
};

module.exports = {
  register, login, logout, refresh, me,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword, changePassword,
  oauthCallback,
};
