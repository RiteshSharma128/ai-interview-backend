require('../../shared/load-env'); require('express-async-errors');
const express = require('express'); const cors = require('cors'); const helmet = require('helmet'); const cookieParser = require('cookie-parser'); const morgan = require('morgan');
const mongoose = require('mongoose'); const { Pool } = require('pg');
const { authenticate, requireAdmin } = require('./middleware/auth');
const app = express(); const PORT = process.env.PORT || 4013;

// const pool = new Pool({ connectionString: process.env.DATABASE_URL?.replace('sslmode=require', 'sslmode=verify-full'), ssl: { rejectUnauthorized: false } });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
app.use(helmet()); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials:true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req,res) => res.json({ status:'ok', service:'admin-service' }));

// All admin routes require admin role
app.use('/api/admin', authenticate, requireAdmin);

// Platform stats
app.get('/api/admin/stats', async (req,res) => {
  const [users, jobs, gam] = await Promise.all([
    pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE created_at > NOW()-INTERVAL \'7 days\') as new_this_week, COUNT(*) FILTER (WHERE is_active=true) as active FROM users'),
    pool.query('SELECT COUNT(*) as total FROM job_listings WHERE is_active=true'),
    pool.query('SELECT SUM(total_interviews) as interviews, SUM(total_problems_solved) as problems FROM user_gamification'),
  ]);
  res.json({ success:true, stats:{ users:users.rows[0], jobs:jobs.rows[0], activity:gam.rows[0] } });
});

// User management
app.get('/api/admin/users', async (req,res) => {
  const { page=1, limit=20, search, role } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  const where = search ? `WHERE email ILIKE '%${search}%' OR name ILIKE '%${search}%'` : '';
  const result = await pool.query(`SELECT id,email,name,role,user_type,is_verified,is_active,created_at FROM users ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [parseInt(limit), skip]);
  const count = await pool.query(`SELECT COUNT(*) FROM users ${where}`);
  res.json({ success:true, users:result.rows, total:parseInt(count.rows[0].count) });
});

app.patch('/api/admin/users/:id', async (req,res) => {
  const { role, isActive } = req.body; const updates = []; const vals = [];
  if (role) { updates.push(`role='${role}'`); }
  if (isActive !== undefined) { updates.push(`is_active=${isActive}`); }
  if (!updates.length) return res.status(400).json({ success:false, message:'Nothing to update' });
  await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=$1`, [req.params.id]);
  res.json({ success:true, message:'User updated' });
});

// Job management
app.post('/api/admin/jobs', async (req,res) => {
  const { title,company,location,type,experience_min,experience_max,skills_required,description,apply_url,salary_min,salary_max } = req.body;
  const result = await pool.query(`INSERT INTO job_listings (title,company,location,type,experience_min,experience_max,skills_required,description,apply_url,salary_min,salary_max) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [title,company,location,type,experience_min||0,experience_max||5,skills_required||[],description,apply_url,salary_min,salary_max]);
  res.status(201).json({ success:true, job:result.rows[0] });
});

app.delete('/api/admin/jobs/:id', async (req,res) => {
  await pool.query('UPDATE job_listings SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ success:true, message:'Job deactivated' });
});

app.use((err,req,res,next) => res.status(err.statusCode||500).json({ success:false, message:err.message }));
async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(PORT, () => console.log(`🔐 Admin Service on port ${PORT}`));
}
start();

// ─── QUESTION MANAGEMENT ─────────────────────────────────────
app.get('/api/admin/questions', authenticate, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, type, difficulty } = req.query;
  const Question = mongoose.model('Question', new mongoose.Schema({
    text: String, type: String, category: String, difficulty: String,
    interviewType: String, tags: [String], isActive: { type: Boolean, default: true },
    upvotes: Number, views: Number,
  }, { collection: 'questions', strict: false }));
  const filter = {};
  if (type) filter.type = type;
  if (difficulty) filter.difficulty = difficulty;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [questions, total] = await Promise.all([
    Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Question.countDocuments(filter),
  ]);
  res.json({ success: true, questions, total });
});

app.post('/api/admin/questions', authenticate, requireAdmin, async (req, res) => {
  const Question = mongoose.model('Question');
  const q = new Question({ ...req.body, createdBy: req.user?.id });
  await q.save();
  res.status(201).json({ success: true, question: q });
});

app.patch('/api/admin/questions/:id', authenticate, requireAdmin, async (req, res) => {
  const Question = mongoose.model('Question');
  const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, question: q });
});

app.delete('/api/admin/questions/:id', authenticate, requireAdmin, async (req, res) => {
  const Question = mongoose.model('Question');
  await Question.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Question deactivated' });
});

// ─── CONTENT MODERATION ──────────────────────────────────────
app.get('/api/admin/reports', authenticate, requireAdmin, async (req, res) => {
  // Fetch reported community posts
  const Post = mongoose.model('Post', new mongoose.Schema({
    title: String, content: String, userId: String, userName: String,
    isActive: Boolean, reports: [{ userId: String, reason: String, createdAt: Date }],
  }, { collection: 'posts', strict: false }));
  const reported = await Post.find({ 'reports.0': { $exists: true }, isActive: true }).lean();
  res.json({ success: true, reports: reported });
});

app.patch('/api/admin/posts/:id/moderate', authenticate, requireAdmin, async (req, res) => {
  const Post = mongoose.model('Post');
  const { action } = req.body; // 'remove' | 'approve'
  await Post.findByIdAndUpdate(req.params.id, { isActive: action !== 'remove' });
  res.json({ success: true, message: `Post ${action}d` });
});

// ─── USER PERFORMANCE REPORTS ────────────────────────────────
app.get('/api/admin/users/:id/performance', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [user, gam] = await Promise.all([
    pool.query('SELECT id, name, email, created_at, user_type, target_role FROM users WHERE id = $1', [id]),
    pool.query('SELECT * FROM user_gamification WHERE user_id = $1', [id]),
  ]);
  const analytics = await pool.query('SELECT * FROM analytics_daily WHERE user_id = $1 ORDER BY date DESC LIMIT 30', [id]);
  res.json({
    success: true,
    user: user.rows[0],
    gamification: gam.rows[0],
    recentActivity: analytics.rows,
  });
});
