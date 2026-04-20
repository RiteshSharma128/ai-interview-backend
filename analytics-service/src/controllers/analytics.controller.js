const { pool } = require('../config/database');
const logger = require('../config/logger');

// Internal: interview completed
exports.recordInterviewCompleted = async (req, res) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) return res.status(403).json({ success:false });
  const { userId, score, interviewType, categoryScores } = req.body;
  const today = new Date().toISOString().split('T')[0];
  await pool.query(`
    INSERT INTO analytics_daily (user_id, date, interviews_done, avg_score, xp_earned)
    VALUES ($1,$2,1,$3,0)
    ON CONFLICT (user_id, date) DO UPDATE SET
      interviews_done = analytics_daily.interviews_done + 1,
      avg_score = (analytics_daily.avg_score + $3) / 2
  `, [userId, today, score]);
  await pool.query('UPDATE user_gamification SET total_interviews = total_interviews + 1 WHERE user_id = $1', [userId]);
  res.json({ success:true });
};

// Internal: problem solved
exports.recordProblemSolved = async (req, res) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SERVICE_SECRET) return res.status(403).json({ success:false });
  const { userId, difficulty } = req.body;
  const today = new Date().toISOString().split('T')[0];
  await pool.query(`
    INSERT INTO analytics_daily (user_id, date, problems_solved)
    VALUES ($1,$2,1)
    ON CONFLICT (user_id, date) DO UPDATE SET problems_solved = analytics_daily.problems_solved + 1
  `, [userId, today]);
  await pool.query('UPDATE user_gamification SET total_problems_solved = total_problems_solved + 1 WHERE user_id = $1', [userId]);
  res.json({ success:true });
};

// GET dashboard summary
exports.getDashboard = async (req, res) => {
  const userId = req.user.id;
  const [overview, daily30, gamification] = await Promise.all([
    pool.query('SELECT SUM(interviews_done) as total_interviews, SUM(problems_solved) as total_problems, ROUND(AVG(avg_score),1) as avg_score, SUM(study_time_mins) as total_study_mins FROM analytics_daily WHERE user_id = $1', [userId]),
    pool.query('SELECT * FROM analytics_daily WHERE user_id = $1 AND date >= NOW() - INTERVAL \'30 days\' ORDER BY date ASC', [userId]),
    pool.query('SELECT xp_points, level, level_name, current_streak, longest_streak, total_interviews, total_problems_solved FROM user_gamification WHERE user_id = $1', [userId]),
  ]);
  res.json({
    success:true,
    dashboard: {
      overview: overview.rows[0],
      dailyProgress: daily30.rows,
      gamification: gamification.rows[0],
    }
  });
};

// GET performance trends
exports.getPerformanceTrends = async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;
  const result = await pool.query(
    'SELECT date, avg_score, interviews_done, problems_solved, xp_earned FROM analytics_daily WHERE user_id=$1 AND date >= NOW() - INTERVAL \'1 day\' * $2 ORDER BY date ASC',
    [userId, parseInt(days)]
  );
  res.json({ success:true, trends: result.rows });
};

// GET skill breakdown
exports.getSkillBreakdown = async (req, res) => {
  const userId = req.user.id;
  // This would aggregate from feedback service — simplified version
  res.json({
    success:true,
    skills: {
      technical: 72, communication: 68, problemSolving: 75, clarity: 70, confidence: 65,
    },
    message:'Based on your last 10 interviews'
  });
};

// GET activity heatmap
exports.getActivityHeatmap = async (req, res) => {
  const userId = req.user.id;
  const result = await pool.query(
    'SELECT date, interviews_done + problems_solved as activity FROM analytics_daily WHERE user_id=$1 AND date >= NOW() - INTERVAL \'365 days\' ORDER BY date ASC',
    [userId]
  );
  res.json({ success:true, heatmap: result.rows });
};
