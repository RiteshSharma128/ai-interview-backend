// const { DSAProblem, UserSubmission } = require('../models/dsa.model');
// const logger = require('../config/logger');
// const axios = require('axios');
// const { runCode: pistonRun, submitCode: pistonSubmit } = require('../utils/codeRunner');

// // ─── GET ALL PROBLEMS ─────────────────────────────────────────
// exports.getProblems = async (req, res) => {
//   const { page=1, limit=20, difficulty, category, tag, company, search, sort='difficulty' } = req.query;
//   const filter = { isActive: true };
//   if (difficulty) filter.difficulty = difficulty;
//   if (category) filter.category = category;
//   if (tag) filter.tags = { $in: [tag] };
//   if (company) filter.companies = { $in: [company.toLowerCase()] };
//   if (search) filter.title = { $regex: search, $options: 'i' };

//   const sortMap = { difficulty:{difficulty:1}, acceptance:{acceptanceRate:-1}, newest:{createdAt:-1}, title:{title:1} };
//   const skip = (parseInt(page)-1)*parseInt(limit);

//   const [problems, total] = await Promise.all([
//     DSAProblem.find(filter).select('-testCases -solutionCode -starterCode -explanation')
//       .sort(sortMap[sort]||sortMap.difficulty).skip(skip).limit(parseInt(limit)).lean(),
//     DSAProblem.countDocuments(filter),
//   ]);

//   const userId = req.user?.id;
//   let solvedSet = new Set();
//   if (userId) {
//     const solved = await UserSubmission.find({ userId, status:'accepted' }).select('problemId').lean();
//     solvedSet = new Set(solved.map(s => s.problemId.toString()));
//   }

//   res.json({
//     success: true,
//     problems: problems.map(p => ({ ...p, isSolved: solvedSet.has(p._id.toString()) })),
//     pagination: { page:parseInt(page), limit:parseInt(limit), total, pages:Math.ceil(total/parseInt(limit)) },
//   });
// };

// // ─── GET SINGLE PROBLEM ───────────────────────────────────────
// exports.getProblem = async (req, res) => {
//   const problem = await DSAProblem.findOne({ slug: req.params.slug, isActive: true }).lean();
//   if (!problem) return res.status(404).json({ success:false, message:'Problem not found' });

//   // Hide hidden test cases input/output
//   problem.testCases = (problem.testCases||[]).map(tc => ({
//     ...tc,
//     input: tc.isHidden ? '(hidden)' : tc.input,
//     expectedOutput: tc.isHidden ? '(hidden)' : tc.expectedOutput,
//   }));
//   delete problem.solutionCode;

//   res.json({ success:true, problem });
// };

// // ─── RUN CODE (test, don't submit) ───────────────────────────
// exports.runCode = async (req, res) => {
//   const { code, language, input } = req.body;
//   if (!code || !language) return res.status(400).json({ success:false, message:'Code and language required' });

//   const SUPPORTED = ['javascript','python','java','cpp'];
//   if (!SUPPORTED.includes(language)) return res.status(400).json({ success:false, message:'Unsupported language' });

//   logger.info(`Running ${language} code for user ${req.user?.id}`);

//   const result = await pistonRun({ code, language, input: input||'' });
//   res.json({ success: true, ...result });
// };

// // ─── SUBMIT CODE ──────────────────────────────────────────────
// exports.submitCode = async (req, res) => {
//   const { slug } = req.params;
//   const { code, language } = req.body;
//   const userId = req.user.id;

//   const problem = await DSAProblem.findOne({ slug }).lean();
//   if (!problem) return res.status(404).json({ success:false, message:'Problem not found' });

//   const SUPPORTED = ['javascript','python','java','cpp'];
//   if (!SUPPORTED.includes(language)) return res.status(400).json({ success:false, message:'Unsupported language' });

//   const testCases = (problem.testCases||[]).filter(tc => !tc.isHidden);

//   logger.info(`Submitting ${language} for ${slug} by ${userId}`);

//   const result = await pistonSubmit({ code, language, testCases });

//   // Save submission
//   const submission = new UserSubmission({
//     userId,
//     problemId: problem._id,
//     problemSlug: slug,
//     language,
//     code,
//     status: result.status,
//     runtime: parseInt(result.runtime)||0,
//     testsPassed: result.testsPassed,
//     testsTotal: result.testsTotal,
//     errorMessage: result.errorMessage,
//   });
//   await submission.save();

//   // Update problem stats
//   await DSAProblem.findByIdAndUpdate(problem._id, {
//     $inc: { totalSubmissions:1, ...(result.status==='accepted'?{acceptedSubmissions:1}:{}) },
//   });

//   // Notify analytics on accept
//   if (result.status === 'accepted') {
//     axios.post(`${process.env.ANALYTICS_SERVICE_URL}/api/analytics/internal/record-problem`, {
//       userId, difficulty: problem.difficulty,
//     }, { headers:{ 'x-internal-secret': process.env.INTERNAL_SERVICE_SECRET } }).catch(()=>{});
//   }

//   res.json({ success:true, ...result, submissionId: submission._id });
// };

// // ─── GET SUBMISSIONS ──────────────────────────────────────────
// exports.getSubmissions = async (req, res) => {
//   const userId = req.user.id;
//   const problem = await DSAProblem.findOne({ slug: req.params.slug }).select('_id').lean();
//   if (!problem) return res.status(404).json({ success:false, message:'Problem not found' });

//   const submissions = await UserSubmission.find({ userId, problemId: problem._id })
//     .select('-code').sort({ submittedAt:-1 }).limit(10).lean();
//   res.json({ success:true, submissions });
// };

// // ─── GET HINT ─────────────────────────────────────────────────
// exports.getHint = async (req, res) => {
//   const problem = await DSAProblem.findOne({ slug: req.params.slug }).select('hints').lean();
//   if (!problem) return res.status(404).json({ success:false, message:'Problem not found' });

//   const idx = parseInt(req.query.hintIndex)||0;
//   const hint = problem.hints?.[idx];
//   res.json({ success:true, hint: hint||null, hintIndex:idx, totalHints: problem.hints?.length||0 });
// };

// // ─── GET STATS ────────────────────────────────────────────────
// exports.getUserStats = async (req, res) => {
//   const userId = req.user.id;
//   const [totalSolved, easySolved, mediumSolved, hardSolved, recentSubmissions] = await Promise.all([
//     UserSubmission.countDocuments({ userId, status:'accepted' }),
//     UserSubmission.distinct('problemId',{userId,status:'accepted'}).then(ids => DSAProblem.countDocuments({_id:{$in:ids},difficulty:'easy'})),
//     UserSubmission.distinct('problemId',{userId,status:'accepted'}).then(ids => DSAProblem.countDocuments({_id:{$in:ids},difficulty:'medium'})),
//     UserSubmission.distinct('problemId',{userId,status:'accepted'}).then(ids => DSAProblem.countDocuments({_id:{$in:ids},difficulty:'hard'})),
//     UserSubmission.find({userId}).sort({submittedAt:-1}).limit(5).select('-code').lean(),
//   ]);
//   res.json({ success:true, stats:{ totalSolved, easySolved, mediumSolved, hardSolved, recentSubmissions } });
// };

// // ─── GET SUBMISSION CODE ─────────────────────────────────────
// exports.getSubmissionCode = async (req, res) => {
//   const submission = await UserSubmission.findOne({ _id:req.params.submissionId, userId:req.user.id }).lean();
//   if (!submission) return res.status(404).json({ success:false, message:'Not found' });
//   res.json({ success:true, submission });
// };




const { DSAProblem, UserSubmission } = require('../models/dsa.model');
const logger = require('../config/logger');
const axios = require('axios');
const { Pool } = require('pg');
const { runCode: pistonRun, submitCode: pistonSubmit } = require('../utils/codeRunner');

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

exports.getProblems = async (req, res) => {
  const { page=1, limit=20, difficulty, category, tag, company, search, sort='difficulty' } = req.query;
  const filter = { isActive: true };
  if (difficulty) filter.difficulty = difficulty;
  if (category) filter.category = category;
  if (tag) filter.tags = { $in: [tag] };
  if (company) filter.companies = { $in: [company.toLowerCase()] };
  if (search) filter.title = { $regex: search, $options: 'i' };

  const sortMap = { difficulty:{difficulty:1}, acceptance:{acceptanceRate:-1}, newest:{createdAt:-1}, title:{title:1} };
  const skip = (parseInt(page)-1)*parseInt(limit);

  const [problems, total] = await Promise.all([
    DSAProblem.find(filter).select('-testCases -solutionCode -starterCode -explanation')
      .sort(sortMap[sort]||sortMap.difficulty).skip(skip).limit(parseInt(limit)).lean(),
    DSAProblem.countDocuments(filter),
  ]);

  const userId = req.user?.id;
  let solvedSet = new Set();
  if (userId) {
    const solved = await UserSubmission.find({ userId, status:'accepted' }).select('problemId').lean();
    solvedSet = new Set(solved.map(s => s.problemId.toString()));
  }

  res.json({
    success: true,
    problems: problems.map(p => ({ ...p, isSolved: solvedSet.has(p._id.toString()) })),
    pagination: { page:parseInt(page), limit:parseInt(limit), total, pages:Math.ceil(total/parseInt(limit)) },
  });
};

exports.getProblem = async (req, res) => {
  const problem = await DSAProblem.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!problem) return res.status(404).json({ success:false, message:'Problem not found' });

  problem.testCases = (problem.testCases||[]).map(tc => ({
    ...tc,
    input: tc.isHidden ? '(hidden)' : tc.input,
    expectedOutput: tc.isHidden ? '(hidden)' : tc.expectedOutput,
  }));
  delete problem.solutionCode;

  res.json({ success:true, problem });
};

exports.runCode = async (req, res) => {
  const { code, language, input } = req.body;
  if (!code || !language) return res.status(400).json({ success:false, message:'Code and language required' });

  const SUPPORTED = ['javascript','python','java','cpp'];
  if (!SUPPORTED.includes(language)) return res.status(400).json({ success:false, message:'Unsupported language' });

  logger.info(`Running ${language} code for user ${req.user?.id}`);
  const result = await pistonRun({ code, language, input: input||'' });
  res.json({ success: true, ...result });
};

exports.submitCode = async (req, res) => {
  const { slug } = req.params;
  const { code, language } = req.body;
  const userId = req.user.id;

  const problem = await DSAProblem.findOne({ slug }).lean();
  if (!problem) return res.status(404).json({ success:false, message:'Problem not found' });

  const SUPPORTED = ['javascript','python','java','cpp'];
  if (!SUPPORTED.includes(language)) return res.status(400).json({ success:false, message:'Unsupported language' });

  const testCases = (problem.testCases||[]).filter(tc => !tc.isHidden);

  logger.info(`Submitting ${language} for ${slug} by ${userId}`);

  const result = await pistonSubmit({ code, language, testCases });

  const submission = new UserSubmission({
    userId,
    problemId: problem._id,
    problemSlug: slug,
    language,
    code,
    status: result.status,
    runtime: parseInt(result.runtime)||0,
    testsPassed: result.testsPassed,
    testsTotal: result.testsTotal,
    errorMessage: result.errorMessage,
  });
  await submission.save();

  await DSAProblem.findByIdAndUpdate(problem._id, {
    $inc: { totalSubmissions:1, ...(result.status==='accepted'?{acceptedSubmissions:1}:{}) },
  });

  if (result.status === 'accepted') {
    const today = new Date().toISOString().split('T')[0];

    pgPool.query(`
      INSERT INTO analytics_daily (user_id, date, problems_solved, xp_earned)
      VALUES ($1, $2, 1, 50)
      ON CONFLICT (user_id, date) DO UPDATE SET
        problems_solved = analytics_daily.problems_solved + 1,
        xp_earned = analytics_daily.xp_earned + 50
    `, [userId, today]).catch(e => logger.warn('analytics update failed: ' + e.message));

    pgPool.query(`
      UPDATE user_gamification SET
        total_problems_solved = total_problems_solved + 1,
        xp_points = xp_points + 50,
        last_activity_date = CURRENT_DATE,
        current_streak = CASE
          WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
          WHEN last_activity_date = CURRENT_DATE THEN current_streak
          ELSE 1
        END,
        longest_streak = GREATEST(longest_streak, CASE
          WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
          WHEN last_activity_date = CURRENT_DATE THEN current_streak
          ELSE 1
        END)
      WHERE user_id = $1
    `, [userId]).catch(e => logger.warn('gamification update failed: ' + e.message));
  }

  res.json({ success:true, ...result, submissionId: submission._id });
};

exports.getSubmissions = async (req, res) => {
  const userId = req.user.id;
  const problem = await DSAProblem.findOne({ slug: req.params.slug }).select('_id').lean();
  if (!problem) return res.status(404).json({ success:false, message:'Problem not found' });

  const submissions = await UserSubmission.find({ userId, problemId: problem._id })
    .select('-code').sort({ submittedAt:-1 }).limit(10).lean();
  res.json({ success:true, submissions });
};

exports.getHint = async (req, res) => {
  const problem = await DSAProblem.findOne({ slug: req.params.slug }).select('hints').lean();
  if (!problem) return res.status(404).json({ success:false, message:'Problem not found' });

  const idx = parseInt(req.query.hintIndex)||0;
  const hint = problem.hints?.[idx];
  res.json({ success:true, hint: hint||null, hintIndex:idx, totalHints: problem.hints?.length||0 });
};

exports.getUserStats = async (req, res) => {
  const userId = req.user.id;
  const [totalSolved, easySolved, mediumSolved, hardSolved, recentSubmissions] = await Promise.all([
    UserSubmission.countDocuments({ userId, status:'accepted' }),
    UserSubmission.distinct('problemId',{userId,status:'accepted'}).then(ids => DSAProblem.countDocuments({_id:{$in:ids},difficulty:'easy'})),
    UserSubmission.distinct('problemId',{userId,status:'accepted'}).then(ids => DSAProblem.countDocuments({_id:{$in:ids},difficulty:'medium'})),
    UserSubmission.distinct('problemId',{userId,status:'accepted'}).then(ids => DSAProblem.countDocuments({_id:{$in:ids},difficulty:'hard'})),
    UserSubmission.find({userId}).sort({submittedAt:-1}).limit(5).select('-code').lean(),
  ]);
  res.json({ success:true, stats:{ totalSolved, easySolved, mediumSolved, hardSolved, recentSubmissions } });
};

exports.getSubmissionCode = async (req, res) => {
  const submission = await UserSubmission.findOne({ _id:req.params.submissionId, userId:req.user.id }).lean();
  if (!submission) return res.status(404).json({ success:false, message:'Not found' });
  res.json({ success:true, submission });
};