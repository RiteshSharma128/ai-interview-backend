const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { getRedis } = require('../config/redis');

// ─── GENERATE TOKENS ─────────────────────────────────────────
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );

  return { accessToken, refreshToken };
};

// ─── SAVE REFRESH TOKEN TO DB ─────────────────────────────────
const saveRefreshToken = async (userId, refreshToken) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await pool.query(`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `, [userId, tokenHash, expiresAt]);
};

// ─── VERIFY REFRESH TOKEN ─────────────────────────────────────
const verifyRefreshToken = async (refreshToken) => {
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const result = await pool.query(`
    SELECT * FROM refresh_tokens
    WHERE token_hash = $1 AND is_revoked = false AND expires_at > NOW()
  `, [tokenHash]);

  if (!result.rows.length) throw new Error('Invalid or expired refresh token');
  return decoded;
};

// ─── REVOKE REFRESH TOKEN ─────────────────────────────────────
const revokeRefreshToken = async (refreshToken) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await pool.query(`
    UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1
  `, [tokenHash]);
};

// ─── BLACKLIST ACCESS TOKEN (LOGOUT) ─────────────────────────
const blacklistAccessToken = async (token) => {
  const redis = getRedis();
  const decoded = jwt.decode(token);
  if (!decoded?.exp) return;
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await redis.setex(`blacklist:${token}`, ttl, '1');
  }
};

// ─── CHECK IF TOKEN IS BLACKLISTED ───────────────────────────
const isTokenBlacklisted = async (token) => {
  const redis = getRedis();
  const result = await redis.get(`blacklist:${token}`);
  return result === '1';
};

// ─── SET COOKIES ─────────────────────────────────────────────
const setCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh', // Only sent on refresh route
  });
};

const clearCookies = (res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
};

module.exports = {
  generateTokens,
  saveRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  blacklistAccessToken,
  isTokenBlacklisted,
  setCookies,
  clearCookies,
};
