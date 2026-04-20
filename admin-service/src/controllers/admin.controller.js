const { pool } = require('../config/database');
exports.getStats = async (req, res) => {
  const [users, jobs] = await Promise.all([
    pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_verified) as verified, COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL\'7 days\') as new_this_week FROM users'),
    pool.query('SELECT COUNT(*) as total FROM job_listings WHERE is_active=true'),
  ]);
  res.json({ success:true, stats:{ users:users.rows[0], jobs:jobs.rows[0] } });
};
exports.getUsers = async (req, res) => {
  const { search, page=1, limit=20 } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  let q = 'SELECT id,email,name,role,user_type,is_verified,is_active,created_at FROM users';
  const params = [];
  if (search) { q += ' WHERE email ILIKE $1 OR name ILIKE $1'; params.push(`%${search}%`); }
  q += ` ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
  params.push(parseInt(limit), skip);
  const result = await pool.query(q, params);
  const total = await pool.query('SELECT COUNT(*) FROM users');
  res.json({ success:true, users:result.rows, pagination:{page:parseInt(page),total:parseInt(total.rows[0].count)} });
};
exports.toggleUserActive = async (req, res) => {
  const { userId } = req.params;
  const result = await pool.query('UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id,is_active', [userId]);
  res.json({ success:true, user:result.rows[0] });
};
exports.addJob = async (req, res) => {
  const { title,company,location,type,description,skillsRequired,experienceMin,experienceMax,salaryMin,salaryMax,applyUrl } = req.body;
  const result = await pool.query('INSERT INTO job_listings (title,company,location,type,description,skills_required,experience_min,experience_max,salary_min,salary_max,apply_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
    [title,company,location,type,description,skillsRequired,experienceMin,experienceMax,salaryMin,salaryMax,applyUrl]);
  res.status(201).json({ success:true, job:result.rows[0] });
};
exports.deleteJob = async (req, res) => {
  await pool.query('UPDATE job_listings SET is_active=false WHERE id=$1', [req.params.jobId]);
  res.json({ success:true, message:'Job deactivated' });
};
