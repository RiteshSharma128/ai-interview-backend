const { pool } = require('../config/database');

exports.getJobs = async (req, res) => {
  const { page=1, limit=10, type, company, search, skills } = req.query;
  const conditions = ['is_active = true'];
  const values = [];
  let idx = 1;
  if (type) { conditions.push(`type = $${idx++}`); values.push(type); }
  if (company) { conditions.push(`LOWER(company) LIKE $${idx++}`); values.push(`%${company.toLowerCase()}%`); }
  if (search) { conditions.push(`(LOWER(title) LIKE $${idx++} OR LOWER(description) LIKE $${idx-1})`); values.push(`%${search.toLowerCase()}%`); }

  const whereClause = conditions.join(' AND ');
  const skip = (parseInt(page)-1)*parseInt(limit);

  const [jobsResult, countResult] = await Promise.all([
    pool.query(`SELECT * FROM job_listings WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`, [...values, parseInt(limit), skip]),
    pool.query(`SELECT COUNT(*) FROM job_listings WHERE ${whereClause}`, values),
  ]);

  res.json({ success:true, jobs:jobsResult.rows, pagination:{ page:parseInt(page), limit:parseInt(limit), total:parseInt(countResult.rows[0].count), pages:Math.ceil(parseInt(countResult.rows[0].count)/parseInt(limit)) } });
};

exports.getJob = async (req, res) => {
  const result = await pool.query('SELECT * FROM job_listings WHERE id = $1 AND is_active = true', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ success:false, message:'Job not found' });
  res.json({ success:true, job:result.rows[0] });
};

exports.applyJob = async (req, res) => {
  if (!req.user) return res.status(401).json({ success:false, message:'Login required to apply' });
  const { id } = req.params;
  try {
    const result = await pool.query(
      'INSERT INTO job_applications (user_id, job_id) VALUES ($1, $2) RETURNING *',
      [req.user.id, id]
    );
    res.status(201).json({ success:true, application:result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success:false, message:'Already applied to this job' });
    throw err;
  }
};

exports.getMyApplications = async (req, res) => {
  const result = await pool.query(`
    SELECT ja.*, jl.title, jl.company, jl.type, jl.location
    FROM job_applications ja JOIN job_listings jl ON jl.id = ja.job_id
    WHERE ja.user_id = $1 ORDER BY ja.applied_at DESC
  `, [req.user.id]);
  res.json({ success:true, applications:result.rows });
};

exports.updateApplicationStatus = async (req, res) => {
  const { status } = req.body;
  const result = await pool.query(
    'UPDATE job_applications SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
    [status, req.params.appId, req.user.id]
  );
  if (!result.rows.length) return res.status(404).json({ success:false, message:'Application not found' });
  res.json({ success:true, application:result.rows[0] });
};
