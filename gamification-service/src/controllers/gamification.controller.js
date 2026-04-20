const { pool } = require('../config/database');
const logger = require('../config/logger');

const LEVELS = [
  { level:1, name:'Beginner', minXP:0 }, { level:2, name:'Learner', minXP:100 },
  { level:3, name:'Practitioner', minXP:300 }, { level:4, name:'Intermediate', minXP:600 },
  { level:5, name:'Advanced', minXP:1000 }, { level:6, name:'Expert', minXP:1500 },
  { level:7, name:'Master', minXP:2500 }, { level:8, name:'Champion', minXP:4000 },
  { level:9, name:'Legend', minXP:6000 }, { level:10, name:'God Mode', minXP:10000 },
];

const getLevelFromXP = (xp) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
};

exports.getStats = async (req, res) => {
  const userId = req.user.id;
  const result = await pool.query(`
    SELECT g.*, array_agg(json_build_object('name',b.name,'icon',b.icon,'earnedAt',ub.earned_at)) FILTER (WHERE b.id IS NOT NULL) as badges
    FROM user_gamification g
    LEFT JOIN user_badges ub ON ub.user_id = g.user_id
    LEFT JOIN badges b ON b.id = ub.badge_id
    WHERE g.user_id = $1
    GROUP BY g.id
  `, [userId]);
  if (!result.rows.length) return res.status(404).json({ success:false, message:'Stats not found' });
  const stats = result.rows[0];
  const levelInfo = getLevelFromXP(stats.xp_points);
  const nextLevel = LEVELS.find(l => l.level === levelInfo.level + 1);
  res.json({ success:true, stats: { ...stats, levelInfo, nextLevel, xpToNextLevel: nextLevel ? nextLevel.minXP - stats.xp_points : 0 } });
};

exports.addXP = async (req, res) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) return res.status(403).json({ success:false, message:'Forbidden' });
  const { userId, xp, reason, type } = req.body;
  const result = await pool.query('UPDATE user_gamification SET xp_points = xp_points + $1, updated_at = NOW() WHERE user_id = $2 RETURNING *', [xp, userId]);
  if (!result.rows.length) return res.status(404).json({ success:false, message:'User not found' });
  const newXP = result.rows[0].xp_points;
  const levelInfo = getLevelFromXP(newXP);
  await pool.query('UPDATE user_gamification SET level = $1, level_name = $2 WHERE user_id = $3', [levelInfo.level, levelInfo.name, userId]);
  await pool.query('INSERT INTO leaderboard (user_id, all_time_xp, weekly_xp, monthly_xp) VALUES ($1,$2,$2,$2) ON CONFLICT (user_id) DO UPDATE SET all_time_xp = leaderboard.all_time_xp + $2, weekly_xp = leaderboard.weekly_xp + $2, monthly_xp = leaderboard.monthly_xp + $2', [userId, xp]);
  await checkAndAwardBadges(userId, result.rows[0]);
  logger.info(`XP added: ${userId} +${xp} XP (${reason})`);
  res.json({ success:true, xpAdded: xp, totalXP: newXP, level: levelInfo });
};

exports.updateStreak = async (req, res) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) return res.status(403).json({ success:false, message:'Forbidden' });
  const { userId } = req.body;
  const result = await pool.query('SELECT * FROM user_gamification WHERE user_id = $1', [userId]);
  if (!result.rows.length) return res.status(404).json({ success:false, message:'Not found' });
  const g = result.rows[0];
  const today = new Date().toISOString().split('T')[0];
  const lastActivity = g.last_activity_date?.toISOString().split('T')[0];
  let newStreak = g.current_streak;
  if (lastActivity === today) return res.json({ success:true, streak: newStreak, message:'Already updated today' });
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  newStreak = lastActivity === yesterday ? newStreak + 1 : 1;
  const longest = Math.max(newStreak, g.longest_streak);
  await pool.query('UPDATE user_gamification SET current_streak=$1, longest_streak=$2, last_activity_date=$3 WHERE user_id=$4', [newStreak, longest, today, userId]);
  res.json({ success:true, streak: newStreak, longestStreak: longest });
};

exports.getLeaderboard = async (req, res) => {
  const { period = 'all_time', limit = 20 } = req.query;
  const col = period === 'weekly' ? 'weekly_xp' : period === 'monthly' ? 'monthly_xp' : 'all_time_xp';
  const result = await pool.query(`SELECT u.id, u.name, u.avatar_url, u.target_role, l.${col} as xp, g.level, g.level_name, g.current_streak FROM leaderboard l JOIN users u ON u.id = l.user_id JOIN user_gamification g ON g.user_id = l.user_id WHERE u.is_active = true ORDER BY l.${col} DESC LIMIT $1`, [parseInt(limit)]);
  res.json({ success:true, leaderboard: result.rows.map((r,i) => ({ ...r, rank: i+1 })), period });
};

exports.getBadges = async (req, res) => {
  const userId = req.user.id;
  const [earned, all] = await Promise.all([
    pool.query('SELECT b.*, ub.earned_at FROM badges b JOIN user_badges ub ON ub.badge_id = b.id WHERE ub.user_id = $1', [userId]),
    pool.query('SELECT * FROM badges'),
  ]);
  res.json({ success:true, earnedBadges: earned.rows, allBadges: all.rows, progress: `${earned.rows.length}/${all.rows.length}` });
};

const checkAndAwardBadges = async (userId, gamification) => {
  const badges = await pool.query('SELECT * FROM badges');
  for (const badge of badges.rows) {
    const criteria = badge.criteria;
    let earned = false;
    if (criteria.interviews && gamification.total_interviews >= criteria.interviews) earned = true;
    if (criteria.problems && gamification.total_problems_solved >= criteria.problems) earned = true;
    if (criteria.streak && gamification.current_streak >= criteria.streak) earned = true;
    if (earned) {
      await pool.query('INSERT INTO user_badges (user_id, badge_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, badge.id]);
    }
  }
};
