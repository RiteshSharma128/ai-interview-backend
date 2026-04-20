'use strict';

// ─── FILLER WORDS ─────────────────────────────────────────────
const FILLER_WORDS = ['um','uh','like','you know','basically','literally','actually','so','right','okay','kind of','sort of','i mean','well','just'];

// ─── KEYWORD BANKS ────────────────────────────────────────────
const TECH_KEYWORDS = {
  sde: ['algorithm','complexity','data structure','design pattern','API','database','scalability','microservices','testing','optimization'],
  hr: ['team','collaboration','communication','leadership','deadline','problem','solution','growth','feedback','initiative'],
  product_manager: ['metrics','KPI','roadmap','user','A/B test','stakeholder','priority','MVP','data-driven','hypothesis'],
  data_analyst: ['SQL','dataset','analysis','visualization','model','accuracy','precision','recall','correlation','regression'],
};

// ─── DETECT FILLER WORDS ──────────────────────────────────────
const detectFillerWords = (text) => {
  if (!text) return { fillerWords: [], fillerCount: 0 };
  const lower = text.toLowerCase();
  const found = FILLER_WORDS.filter(w => {
    const regex = new RegExp(`\\b${w.replace(/\s+/g,'\\s+')}\\b`,'g');
    return regex.test(lower);
  });
  return { fillerWords: found, fillerCount: found.length };
};

// ─── STAR METHOD EVALUATION ───────────────────────────────────
const evaluateSTAR = (text) => {
  if (!text) return { situation:{present:false,score:0},task:{present:false,score:0},action:{present:false,score:0},result:{present:false,score:0},totalScore:0 };
  const lower = text.toLowerCase();

  const patterns = {
    situation: ['situation','context','background','was working','when i','there was','we had','the project','the problem'],
    task:      ['task','responsibility','my role','i was responsible','i needed to','i had to','goal was','objective'],
    action:    ['i did','i implemented','i created','i developed','i led','i decided','i approached','action','step','i took'],
    result:    ['result','outcome','achieved','improved','reduced','increased','successfully','ultimately','consequently','as a result','impact'],
  };

  const scores = {};
  let total = 0;

  for (const [key, words] of Object.entries(patterns)) {
    const present = words.some(w => lower.includes(w));
    const score = present ? 25 : 0;
    scores[key] = { present, score };
    total += score;
  }

  return { ...scores, totalScore: total };
};

// ─── SCORE CLARITY ────────────────────────────────────────────
const scoreClarity = (text) => {
  if (!text || text.length < 10) return 20;
  const wordCount = text.trim().split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]+/).filter(Boolean).length;
  const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
  const { fillerCount } = detectFillerWords(text);

  let score = 70;
  if (wordCount >= 50 && wordCount <= 300) score += 10;
  if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 25) score += 10;
  if (fillerCount === 0) score += 10;
  else if (fillerCount > 5) score -= 15;
  else if (fillerCount > 3) score -= 8;

  return Math.max(0, Math.min(100, score));
};

// ─── SCORE RELEVANCE ──────────────────────────────────────────
const scoreRelevance = (text, question, interviewType) => {
  if (!text) return 20;
  const lower = text.toLowerCase();
  const keywords = TECH_KEYWORDS[interviewType] || TECH_KEYWORDS.sde;
  const mentioned = keywords.filter(k => lower.includes(k.toLowerCase()));
  const ratio = mentioned.length / keywords.length;

  let score = 40 + Math.round(ratio * 40);
  if (text.length > 100) score += 10;
  if (text.length > 200) score += 10;

  return Math.max(0, Math.min(100, score));
};

// ─── SCORE CONFIDENCE ─────────────────────────────────────────
const scoreConfidence = (text) => {
  if (!text) return 30;
  const lower = text.toLowerCase();
  const confidentPhrases = ['i implemented','i led','i achieved','i designed','i built','i solved','successfully','i am confident','i have experience','i know'];
  const uncertainPhrases = ['i think maybe','i m not sure','i guess','i don t know','perhaps','i m not really','kind of','sort of'];

  const confidentCount = confidentPhrases.filter(p => lower.includes(p)).length;
  const uncertainCount = uncertainPhrases.filter(p => lower.includes(p)).length;

  let score = 60 + (confidentCount * 8) - (uncertainCount * 10);
  return Math.max(0, Math.min(100, score));
};

// ─── GENERATE IDEAL ANSWER PLACEHOLDER ───────────────────────
const generateIdealAnswer = (questionText, interviewType) => {
  // Placeholder — replace with AI call when API key is added
  return `A strong answer to "${questionText}" should:
1. Use the STAR method (Situation, Task, Action, Result) for behavioral questions
2. Include specific examples with measurable outcomes
3. Demonstrate relevant technical knowledge and skills
4. Show problem-solving ability and growth mindset
5. Be concise, structured, and confident in delivery`;
};

// ─── GENERATE TIPS ───────────────────────────────────────────
const generateTips = (scores, fillerCount, wordCount, starScore) => {
  const tips = [];
  if (fillerCount > 3) tips.push('Practice reducing filler words like "um", "uh", and "like" — record yourself and review');
  if (wordCount < 50) tips.push('Give more detailed answers — aim for 100-200 words with specific examples');
  if (wordCount > 400) tips.push('Try to be more concise — focus on the most impactful points');
  if (starScore < 50) tips.push('Use the STAR method: Situation → Task → Action → Result for behavioral questions');
  if (scores.clarity < 60) tips.push('Structure your answer with a clear beginning, middle, and conclusion');
  if (scores.relevance < 60) tips.push('Include more domain-specific keywords and technical terminology relevant to the role');
  if (scores.confidence < 60) tips.push('Use confident, decisive language. Replace "I think" with "I know" and "I am experienced in"');
  if (tips.length === 0) tips.push('Great answer! Keep maintaining this quality and add even more specific metrics/numbers');
  return tips.slice(0, 3);
};

// ─── GRADE FROM SCORE ────────────────────────────────────────
const scoreToGrade = (score) => {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 45) return 'D';
  return 'F';
};

// ─── EVALUATE SINGLE ANSWER ──────────────────────────────────
const evaluateAnswer = (answer, question, interviewType) => {
  const text = answer.answerText || '';
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const { fillerWords, fillerCount } = detectFillerWords(text);
  const starEval = evaluateSTAR(text);
  const keywords = TECH_KEYWORDS[interviewType] || TECH_KEYWORDS.sde;
  const mentioned = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
  const missed = keywords.filter(k => !text.toLowerCase().includes(k.toLowerCase())).slice(0, 3);

  const scores = {
    clarity:       scoreClarity(text),
    relevance:     scoreRelevance(text, question.text, interviewType),
    confidence:    scoreConfidence(text),
    technical:     question.type === 'technical' ? scoreRelevance(text, question.text, interviewType) : 70,
    communication: Math.round((scoreClarity(text) + scoreConfidence(text)) / 2),
  };
  scores.overall = Math.round((scores.clarity + scores.relevance + scores.confidence + scores.communication) / 4);

  const strengths = [];
  const improvements = [];
  if (scores.clarity >= 75) strengths.push('Clear and well-structured answer');
  if (scores.confidence >= 75) strengths.push('Confident and decisive communication');
  if (starEval.totalScore >= 75) strengths.push('Good use of STAR method');
  if (wordCount >= 80 && wordCount <= 250) strengths.push('Appropriate answer length');
  if (scores.clarity < 60) improvements.push('Improve answer structure and clarity');
  if (scores.confidence < 60) improvements.push('Use more confident language');
  if (starEval.totalScore < 50) improvements.push('Incorporate STAR method more explicitly');
  if (fillerCount > 3) improvements.push(`Reduce filler words (found: ${fillerWords.slice(0,3).join(', ')})`);

  return {
    questionId:    question.questionId,
    questionText:  question.text,
    userAnswer:    text,
    idealAnswer:   generateIdealAnswer(question.text, interviewType),
    scores,
    starEvaluation: starEval,
    fillerWords,
    fillerCount,
    wordCount,
    timeTaken: answer.timeTaken || 0,
    strengths,
    improvements,
    tips: generateTips(scores, fillerCount, wordCount, starEval.totalScore),
    keywords: { mentioned, missed },
  };
};

// ─── EVALUATE FULL SESSION ────────────────────────────────────
const evaluateSession = ({ answers, questions, interviewType, duration }) => {
  const answerFeedbacks = answers.map((answer, i) => {
    const question = questions.find(q => q.questionId === answer.questionId) || questions[i] || { text: 'Question', questionId: answer.questionId, type: 'behavioral' };
    return evaluateAnswer(answer, question, interviewType);
  });

  const avgScore = (key) => {
    const vals = answerFeedbacks.map(a => a.scores[key]).filter(Boolean);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  };

  const categoryScores = {
    technical:     avgScore('technical'),
    communication: avgScore('communication'),
    confidence:    avgScore('confidence'),
    clarity:       avgScore('clarity'),
    problemSolving: avgScore('relevance'),
  };

  const overallScore = Math.round(Object.values(categoryScores).reduce((s, v) => s + v, 0) / Object.keys(categoryScores).length);

  const strongAreas = Object.entries(categoryScores).filter(([,v]) => v >= 75).map(([k]) => k);
  const weakAreas   = Object.entries(categoryScores).filter(([,v]) => v < 60).map(([k]) => k);

  const allTips = answerFeedbacks.flatMap(a => a.tips);
  const topTips = [...new Set(allTips)].slice(0, 5);

  const summary = `You completed a ${interviewType.toUpperCase()} mock interview with an overall score of ${overallScore}/100. ` +
    (strongAreas.length ? `Strong areas: ${strongAreas.join(', ')}. ` : '') +
    (weakAreas.length ? `Areas to improve: ${weakAreas.join(', ')}.` : 'Keep up the great work!');

  return { overallScore, categoryScores, answerFeedbacks, summary, strongAreas, weakAreas, topTips, overallGrade: scoreToGrade(overallScore), duration };
};

module.exports = { evaluateSession, evaluateAnswer, detectFillerWords, evaluateSTAR };
