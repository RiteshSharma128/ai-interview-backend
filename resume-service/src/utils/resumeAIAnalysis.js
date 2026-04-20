// ================================================================
// RESUME AI STRENGTH ANALYSIS
// ================================================================
// HOW TO ENABLE (in resume-service):
// Option 1 — OpenAI:
//   Set OPENAI_API_KEY in .env
//   Set ENABLE_AI_RESUME_ANALYSIS=true
//
// Option 2 — Gemini (cheaper):
//   Set GEMINI_API_KEY in .env
//   Set ENABLE_AI_RESUME_ANALYSIS=true
//   Set RESUME_AI_MODEL=gemini-pro
// ================================================================

const axios = require('axios');

// ─── AI ANALYSIS WITH OPENAI ──────────────────────────────────
const analyzeWithOpenAI = async (resumeData) => {
  // TODO: Set OPENAI_API_KEY + ENABLE_AI_RESUME_ANALYSIS=true to activate
  const prompt = buildResumePrompt(resumeData);

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: process.env.RESUME_AI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume reviewer and career coach. Analyze resumes and provide structured, actionable feedback in JSON format only.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const content = response.data.choices[0]?.message?.content;
  return JSON.parse(content);
};

// ─── AI ANALYSIS WITH GEMINI ──────────────────────────────────
const analyzeWithGemini = async (resumeData) => {
  // TODO: Set GEMINI_API_KEY + ENABLE_AI_RESUME_ANALYSIS=true to activate
  const prompt = buildResumePrompt(resumeData);

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1000 },
    },
    { timeout: 30000 }
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(text);
};

// ─── PROMPT BUILDER ───────────────────────────────────────────
const buildResumePrompt = (resumeData) => {
  return `Analyze this resume and return a JSON object with exactly this structure:
{
  "overallScore": <number 0-100>,
  "grade": <"A"|"B"|"C"|"D">,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "sectionScores": {
    "summary": <0-100>,
    "experience": <0-100>,
    "skills": <0-100>,
    "education": <0-100>,
    "projects": <0-100>
  },
  "actionableImprovements": [
    {"priority": "high", "section": "<section>", "suggestion": "<specific suggestion>"},
    {"priority": "medium", "section": "<section>", "suggestion": "<specific suggestion>"},
    {"priority": "low", "section": "<section>", "suggestion": "<specific suggestion>"}
  ],
  "missingKeywords": ["<keyword 1>", "<keyword 2>"],
  "impactScore": <0-100>,
  "readabilityScore": <0-100>
}

Resume data:
Name: ${resumeData.name || 'Not provided'}
Summary: ${resumeData.summary || 'Not provided'}
Skills: ${resumeData.skills?.join(', ') || 'Not provided'}
Experience count: ${resumeData.experience?.length || 0}
Experience details: ${resumeData.experience?.map(e => `${e.title} at ${e.company}: ${e.description}`).join(' | ') || 'None'}
Education: ${resumeData.education?.map(e => `${e.degree} from ${e.institution}`).join(', ') || 'Not provided'}
Projects count: ${resumeData.projects?.length || 0}
Projects: ${resumeData.projects?.map(p => `${p.name}: ${p.description}`).join(' | ') || 'None'}`;
};

// ─── RULE-BASED PLACEHOLDER ───────────────────────────────────
const placeholderAnalysis = (resumeData) => {
  let score = 0;
  const strengths = [];
  const weaknesses = [];
  const improvements = [];
  const sectionScores = { summary: 0, experience: 0, skills: 0, education: 0, projects: 0 };

  // Summary analysis
  if (resumeData.summary?.length > 200) {
    sectionScores.summary = 85; score += 18;
    strengths.push('Professional summary is well-detailed');
  } else if (resumeData.summary?.length > 50) {
    sectionScores.summary = 60; score += 12;
    improvements.push({ priority: 'medium', section: 'Summary', suggestion: 'Expand your summary to 200+ characters with specific achievements' });
  } else {
    sectionScores.summary = 20; score += 3;
    weaknesses.push('Summary is too brief or missing');
    improvements.push({ priority: 'high', section: 'Summary', suggestion: 'Add a compelling professional summary highlighting your expertise and goals' });
  }

  // Skills analysis
  const skillCount = resumeData.skills?.length || 0;
  if (skillCount >= 10) {
    sectionScores.skills = 90; score += 18;
    strengths.push(`Strong skills section with ${skillCount} skills`);
  } else if (skillCount >= 5) {
    sectionScores.skills = 65; score += 13;
    improvements.push({ priority: 'medium', section: 'Skills', suggestion: `Add more relevant skills (you have ${skillCount}, aim for 10+)` });
  } else {
    sectionScores.skills = 30; score += 5;
    weaknesses.push('Very few skills listed');
    improvements.push({ priority: 'high', section: 'Skills', suggestion: 'Add at least 10 technical and soft skills relevant to your target role' });
  }

  // Experience analysis
  const expCount = resumeData.experience?.length || 0;
  if (expCount >= 3) {
    sectionScores.experience = 85; score += 25;
    strengths.push('Multiple experiences demonstrate career progression');
  } else if (expCount >= 1) {
    sectionScores.experience = 65; score += 18;
    const hasMetrics = resumeData.experience?.some(e => /\d+%|\d+x|\$\d+|\d+ users|\d+ million/i.test(e.description));
    if (!hasMetrics) improvements.push({ priority: 'high', section: 'Experience', suggestion: 'Add quantified achievements (%, numbers, $, users) to your experience bullets' });
  } else {
    sectionScores.experience = 20; score += 5;
    weaknesses.push('No work experience listed');
    improvements.push({ priority: 'high', section: 'Experience', suggestion: 'Add internships, freelance work, or personal projects as experience' });
  }

  // Education analysis
  const eduCount = resumeData.education?.length || 0;
  if (eduCount >= 1) {
    sectionScores.education = 80; score += 12;
    strengths.push('Education section is present');
  } else {
    sectionScores.education = 20; score += 2;
    weaknesses.push('Education section missing');
    improvements.push({ priority: 'medium', section: 'Education', suggestion: 'Add your degree, institution, and graduation year' });
  }

  // Projects analysis
  const projCount = resumeData.projects?.length || 0;
  if (projCount >= 2) {
    sectionScores.projects = 85; score += 15;
    strengths.push(`${projCount} projects showcase practical skills`);
  } else if (projCount >= 1) {
    sectionScores.projects = 60; score += 10;
    improvements.push({ priority: 'medium', section: 'Projects', suggestion: 'Add more projects (aim for 2-3) with tech stack and impact metrics' });
  } else {
    sectionScores.projects = 20; score += 3;
    weaknesses.push('No projects listed');
    improvements.push({ priority: 'high', section: 'Projects', suggestion: 'Add 2-3 significant projects with GitHub links, tech stack, and outcomes' });
  }

  const missingKeywords = [];
  const text = JSON.stringify(resumeData).toLowerCase();
  ['github', 'api', 'database', 'testing', 'agile', 'docker'].forEach(kw => {
    if (!text.includes(kw)) missingKeywords.push(kw);
  });

  return {
    overallScore: Math.min(100, Math.round(score)),
    grade: score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D',
    summary: `Your resume scores ${Math.min(100, Math.round(score))}/100. ${strengths.length > 0 ? `Key strengths: ${strengths[0].toLowerCase()}.` : ''} Focus on ${improvements[0]?.suggestion?.toLowerCase() || 'adding more details'}.`,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 3),
    sectionScores,
    actionableImprovements: improvements.slice(0, 5),
    missingKeywords: missingKeywords.slice(0, 5),
    impactScore: resumeData.experience?.some(e => /\d+%|\d+x/.test(e.description)) ? 70 : 35,
    readabilityScore: resumeData.summary?.length > 100 ? 75 : 50,
    provider: 'rule-based',
    setupNote: 'To enable AI-powered analysis: set OPENAI_API_KEY or GEMINI_API_KEY + ENABLE_AI_RESUME_ANALYSIS=true in .env',
  };
};

// ─── MAIN EXPORT ──────────────────────────────────────────────
const analyzeResumeStrength = async (resumeData) => {
  const enabled = process.env.ENABLE_AI_RESUME_ANALYSIS === 'true';
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  if (enabled && hasOpenAI) {
    try {
      return await analyzeWithOpenAI(resumeData);
    } catch (err) {
      console.warn('OpenAI resume analysis failed:', err.message, '— falling back to rule-based');
    }
  }

  if (enabled && hasGemini) {
    try {
      return await analyzeWithGemini(resumeData);
    } catch (err) {
      console.warn('Gemini resume analysis failed:', err.message, '— falling back to rule-based');
    }
  }

  return placeholderAnalysis(resumeData);
};

module.exports = { analyzeResumeStrength };
