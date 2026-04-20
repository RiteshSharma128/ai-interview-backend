const { Resume } = require('../models/resume.model');

exports.getResume = async (req, res) => {
  const resume = await Resume.findOne({ userId:req.user.id }).lean();
  res.json({ success:true, resume: resume || null });
};

exports.saveResume = async (req, res) => {
  const data = req.body;
  const atsResult = calcAtsScore(data);
  const resume = await Resume.findOneAndUpdate(
    { userId:req.user.id },
    { ...data, userId:req.user.id, atsScore:atsResult.score, atsFeedback:atsResult.feedback },
    { new:true, upsert:true }
  );
  res.json({ success:true, resume, atsScore:atsResult.score, atsFeedback:atsResult.feedback });
};

exports.getAtsScore = async (req, res) => {
  const result = calcAtsScore(req.body);
  res.json({ success:true, ...result });
};

exports.generateCoverLetter = async (req, res) => {
  const { jobTitle, company, jobDescription } = req.body;
  const resume = await Resume.findOne({ userId:req.user.id }).lean();
  // Placeholder — replace with AI call later
  const letter = `Dear Hiring Manager,\n\nI am writing to express my interest in the ${jobTitle} position at ${company}. With my background in ${resume?.skills?.slice(0,3).join(', ') || 'software development'}, I am confident I would be a valuable addition to your team.\n\n[Full AI-generated cover letter will appear here when AI API is configured]\n\nSincerely,\n${resume?.name || 'Your Name'}`;
  res.json({ success:true, coverLetter:letter });
};

const calcAtsScore = (resumeData) => {
  let score = 0; const feedback = [];
  if (resumeData.summary?.length > 50) { score += 15; } else { feedback.push('Add a professional summary (50+ words)'); }
  if (resumeData.skills?.length >= 5) { score += 20; } else { feedback.push('Add at least 5 skills'); }
  if (resumeData.experience?.length >= 1) { score += 25; } else { feedback.push('Add work experience'); }
  if (resumeData.education?.length >= 1) { score += 15; } else { feedback.push('Add education details'); }
  if (resumeData.projects?.length >= 1) { score += 10; } else { feedback.push('Add at least 1 project'); }
  if (resumeData.email) { score += 5; } else { feedback.push('Add email address'); }
  if (resumeData.phone) { score += 5; } else { feedback.push('Add phone number'); }
  if (resumeData.name) { score += 5; } else { feedback.push('Add your name'); }
  return { score, feedback, grade: score>=80?'A':score>=60?'B':score>=40?'C':'D' };
};

exports.matchJobDescription = async (req, res) => {
  const { jobDescription } = req.body;
  const resume = await Resume.findOne({ userId: req.user.id }).lean();
  if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
  if (!jobDescription) return res.status(400).json({ success: false, message: 'Job description required' });

  const resumeSkills = (resume.skills || []).map(s => s.toLowerCase());
  const jdWords = jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3);

  // Find matching skills
  const matchedSkills = resumeSkills.filter(skill =>
    jdWords.some(word => skill.includes(word) || word.includes(skill))
  );

  // Find missing keywords from JD
  const techKeywords = ['react', 'node', 'python', 'java', 'sql', 'aws', 'docker', 'kubernetes',
    'typescript', 'mongodb', 'redis', 'graphql', 'rest', 'microservices', 'ci/cd', 'git',
    'agile', 'scrum', 'machine learning', 'data analysis', 'tensorflow', 'spring'];

  const jdRequiredSkills = techKeywords.filter(kw => jobDescription.toLowerCase().includes(kw));
  const missingSkills = jdRequiredSkills.filter(kw => !resumeSkills.some(s => s.includes(kw)));

  const matchScore = jdRequiredSkills.length > 0
    ? Math.round((matchedSkills.length / Math.max(jdRequiredSkills.length, 1)) * 100)
    : Math.min(100, Math.round((matchedSkills.length / Math.max(resumeSkills.length, 1)) * 100));

  res.json({
    success: true,
    matchScore: Math.min(100, matchScore),
    matchedSkills,
    missingSkills,
    totalJdSkills: jdRequiredSkills.length,
    recommendation: matchScore >= 70
      ? 'Great match! Apply with confidence.'
      : matchScore >= 50
      ? 'Decent match. Highlight relevant experience.'
      : 'Consider adding missing skills to your resume.',
  });
};
