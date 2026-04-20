const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { pool } = require('./database');
const logger = require('./logger');

// ─── GOOGLE STRATEGY ─────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0]?.value;
    const name = profile.displayName;
    const avatar = profile.photos[0]?.value;

    // Check if user exists
    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      // Create new user
      result = await pool.query(`
        INSERT INTO users (email, name, avatar_url, is_verified, oauth_provider, oauth_id)
        VALUES ($1, $2, $3, true, 'google', $4)
        RETURNING *
      `, [email, name, avatar, profile.id]);

      // Create profile & gamification record
      await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [result.rows[0].id]);
      await pool.query('INSERT INTO user_gamification (user_id) VALUES ($1)', [result.rows[0].id]);
    }

    return done(null, result.rows[0]);
  } catch (err) {
    logger.error('Google OAuth error:', err);
    return done(err, null);
  }
}));

// ─── GITHUB STRATEGY ─────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    const name = profile.displayName || profile.username;
    const avatar = profile.photos?.[0]?.value;

    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO users (email, name, avatar_url, is_verified, oauth_provider, oauth_id)
        VALUES ($1, $2, $3, true, 'github', $4)
        RETURNING *
      `, [email, name, avatar, profile.id.toString()]);

      await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [result.rows[0].id]);
      await pool.query('INSERT INTO user_gamification (user_id) VALUES ($1)', [result.rows[0].id]);
    }

    return done(null, result.rows[0]);
  } catch (err) {
    logger.error('GitHub OAuth error:', err);
    return done(err, null);
  }
}));
