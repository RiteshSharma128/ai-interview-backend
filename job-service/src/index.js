require('../../shared/load-env'); require('express-async-errors');
const express = require('express'); const cors = require('cors'); const helmet = require('helmet'); const cookieParser = require('cookie-parser'); const morgan = require('morgan');
const { Pool } = require('pg');
const { authenticate } = require('./middleware/auth');
const app = express(); const PORT = process.env.PORT || 4009;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
app.use(helmet()); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials:true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req,res) => res.json({ status:'ok', service:'job-service' }));

// GET jobs (public)
app.get('/api/jobs', async (req,res) => {
  const { page=1, limit=20, type, search, skills } = req.query;
  const skip = (parseInt(page)-1)*parseInt(limit);
  const filter = []; const vals = [];
  if (type) { filter.push(`type = $${vals.length+1}`); vals.push(type); }
  if (search) { filter.push(`(title ILIKE $${vals.length+1} OR company ILIKE $${vals.length+1})`); vals.push(`%${search}%`); }
  const where = filter.length ? `WHERE is_active=true AND ${filter.join(' AND ')}` : 'WHERE is_active=true';
  const result = await pool.query(`SELECT * FROM job_listings ${where} ORDER BY created_at DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`, [...vals, parseInt(limit), skip]);
  const count = await pool.query(`SELECT COUNT(*) FROM job_listings ${where}`, vals);
  res.json({ success:true, jobs:result.rows, total:parseInt(count.rows[0].count) });
});

// GET recommended jobs for user
app.get('/api/jobs/recommended', authenticate, async (req,res) => {
  const userSkills = req.query.skills?.split(',') || [];
  const result = await pool.query(`SELECT * FROM job_listings WHERE is_active=true AND skills_required && $1 ORDER BY created_at DESC LIMIT 10`, [userSkills]);
  res.json({ success:true, jobs:result.rows });
});


// Company preparation tracks  
app.get('/api/jobs/company-tracks', (req, res) => {
  const tracks = [
    { company: 'Google', rounds: ['DSA', 'System Design', 'Behavioral', 'Googleyness'], prepTime: '8-12 weeks', difficulty: 'hard', tips: 'Focus on LC Hard, distributed systems, leadership principles' },
    { company: 'Amazon', rounds: ['OA', 'DSA', 'System Design', 'Leadership Principles'], prepTime: '6-8 weeks', difficulty: 'medium', tips: '14 Leadership Principles are key. STAR method for every answer.' },
    { company: 'Microsoft', rounds: ['OA', 'DSA', 'System Design', 'Culture Fit'], prepTime: '4-6 weeks', difficulty: 'medium', tips: 'Focus on problem solving approach, growth mindset questions.' },
    { company: 'Meta', rounds: ['DSA', 'System Design', 'Behavioral'], prepTime: '8-10 weeks', difficulty: 'hard', tips: 'Speed matters. Practice timed LC. Know FB system design patterns.' },
    { company: 'Flipkart', rounds: ['OA', 'DSA', 'System Design', 'HR'], prepTime: '4-6 weeks', difficulty: 'medium', tips: 'Focus on e-commerce system design. Strong DSA fundamentals.' },
    { company: 'Swiggy', rounds: ['DSA', 'System Design', 'HR'], prepTime: '3-4 weeks', difficulty: 'easy', tips: 'Food delivery system design. Good communication skills needed.' },
  ];
  res.json({ success: true, tracks });
});




// Company preparation track - GET
app.get('/api/jobs/company-track/:company', authenticate, async (req, res) => {
  const company = req.params.company.toLowerCase();
  const tracks = {
    google: {
      company: 'Google', rounds: ['Online Assessment','Phone Screen','Technical x4','System Design','Behavioral (Googliness)'],
      focus: ['DSA (Hard)', 'System Design', 'Behavioral - leadership', 'Code Quality'],
      tips: ['Practice LeetCode Hard', 'Study Google products', 'Clean scalable code matters', 'Googliness = humility + impact'],
      avgPackage: '40-80 LPA',
    },
    amazon: {
      company: 'Amazon', rounds: ['OA','Phone Screen','4-6 Technical + Bar Raiser'],
      focus: ['DSA Medium-Hard','LP Stories (14 principles)','System Design','Bar Raiser round'],
      tips: ['Prepare 14 Leadership Principle stories','Use STAR method strictly','Customer obsession is key'],
      avgPackage: '35-70 LPA',
    },
    microsoft: {
      company: 'Microsoft', rounds: ['Online Assessment','Phone Screen','4 Technical on-site'],
      focus: ['DSA Medium','System Design','Behavioral','Coding quality'],
      tips: ['Growth mindset stories','Clear communication','Collaborative coding style'],
      avgPackage: '30-65 LPA',
    },
    flipkart: {
      company: 'Flipkart', rounds: ['Machine Coding','Technical x3','System Design','HR'],
      focus: ['Machine Coding (2-3hrs)','LLD','DSA','System Design'],
      tips: ['Strong in OOP/LLD','Practice machine coding problems','E-commerce domain knowledge helps'],
      avgPackage: '25-55 LPA',
    },
  };
  const track = tracks[company] || {
    company: req.params.company,
    rounds: ['Technical Screen', 'Technical x2-3', 'HR/Behavioral'],
    focus: ['DSA', 'System Design', 'Behavioral'],
    tips: ['Practice consistently', 'Research company products', 'Prepare STAR stories'],
    avgPackage: 'Varies',
  };
  res.json({ success: true, track });
});



// Placement progress tracking
app.get('/api/jobs/placement/progress', authenticate, async (req, res) => {
  const userId = req.user.id;
  const apps = await pool.query(`
    SELECT status, COUNT(*) as count FROM job_applications WHERE user_id = $1 GROUP BY status
  `, [userId]);
  const statusMap = {};
  apps.rows.forEach(r => { statusMap[r.status] = parseInt(r.count); });
  const total = apps.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
  res.json({
    success: true,
    progress: {
      total,
      applied: statusMap['applied'] || 0,
      screening: statusMap['screening'] || 0,
      interview: statusMap['interview'] || 0,
      offer: statusMap['offer'] || 0,
      rejected: statusMap['rejected'] || 0,
    },
  });
});



// Placement Progress Dashboard
app.get('/api/jobs/placement/stats', authenticate, async (req, res) => {
  const userId = req.user.id;
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_applications,
      COUNT(*) FILTER (WHERE status = 'applied') as applied,
      COUNT(*) FILTER (WHERE status = 'screening') as screening,
      COUNT(*) FILTER (WHERE status = 'interview') as interview,
      COUNT(*) FILTER (WHERE status = 'offer') as offer,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected
    FROM job_applications WHERE user_id = $1
  `, [userId]);
  res.json({ success: true, stats: result.rows[0] });
});



// Get user applications
app.get('/api/jobs/applications/me', authenticate, async (req,res) => {
  const result = await pool.query(`SELECT ja.*, jl.title, jl.company, jl.type FROM job_applications ja JOIN job_listings jl ON jl.id=ja.job_id WHERE ja.user_id=$1 ORDER BY ja.applied_at DESC`, [req.user.id]);
  res.json({ success:true, applications:result.rows });
});

// Update application status
app.patch('/api/jobs/applications/:appId', authenticate, async (req,res) => {
  const { status } = req.body;
  await pool.query('UPDATE job_applications SET status=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3', [status, req.params.appId, req.user.id]);
  res.json({ success:true, message:'Status updated' });
});

// GET single job
app.get('/api/jobs/:id', async (req,res) => {
  const result = await pool.query('SELECT * FROM job_listings WHERE id=$1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ success:false, message:'Job not found' });
  res.json({ success:true, job:result.rows[0] });
});

// Apply for job
app.post('/api/jobs/:id/apply', authenticate, async (req,res) => {
  const { id } = req.params; const userId = req.user.id;
  try {
    await pool.query('INSERT INTO job_applications (user_id, job_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, id]);
    res.json({ success:true, message:'Applied successfully' });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
});



app.use((err,req,res,next) => res.status(err.statusCode||500).json({ success:false, message:err.message }));
app.listen(PORT, async () => {
  // Seed sample jobs
  try {
    const count = await pool.query('SELECT COUNT(*) FROM job_listings');
    if (parseInt(count.rows[0].count) === 0) {
      await pool.query(`INSERT INTO job_listings (title,company,location,type,experience_min,experience_max,skills_required,description,apply_url) VALUES
        ('Software Engineer','Google','Bangalore, India','full-time',2,5,ARRAY['javascript','react','node.js'],'Join Google as SDE. Work on scalable systems.','https://careers.google.com'),
        ('Frontend Developer','Amazon','Hyderabad, India','full-time',1,3,ARRAY['react','typescript','css'],'Build customer-facing UIs for Amazon.','https://amazon.jobs'),
        ('Full Stack Intern','Razorpay','Remote','internship',0,1,ARRAY['node.js','react','mongodb'],'6-month SDE internship at Razorpay.','https://razorpay.com/jobs'),
        ('Data Analyst','Microsoft','Pune, India','full-time',2,4,ARRAY['python','sql','excel','power-bi'],'Analyse large-scale product data.','https://careers.microsoft.com')
      `);
      console.log('✅ Jobs seeded');
    }
  } catch (e) { console.log('Job seed skipped:', e.message); }
  console.log(`💼 Job Service on port ${PORT}`);
});


