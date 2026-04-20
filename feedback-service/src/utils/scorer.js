// ─── RULE-BASED SCORING ENGINE ────────────────────────────────
// Placeholder AI — pure algorithmic scoring
// Replace evaluateWithAI() with real OpenAI/Gemini call later

const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'literally',
  'actually', 'so yeah', 'right', 'okay so', 'kind of', 'sort of',
  'i mean', 'whatever', 'anyway',
];

const STAR_KEYWORDS = {
  situation: ['situation', 'context', 'background', 'when i', 'at my previous', 'in my last', 'there was a time', 'once i'],
  task: ['task', 'responsible', 'needed to', 'had to', 'my role', 'my job was', 'i was assigned', 'challenge was'],
  action: ['i did', 'i took', 'i implemented', 'i decided', 'i created', 'i worked', 'i developed', 'my approach', 'i collaborated'],
  result: ['result', 'outcome', 'achieved', 'improved', 'increased', 'reduced', 'saved', 'successfully', 'as a result', 'the impact'],
};

const TECHNICAL_KEYWORDS = {
  sde: ['algorithm', 'complexity', 'data structure', 'api', 'database', 'microservice', 'scalab', 'deploy', 'test', 'debug'],
  hr: ['team', 'collaborate', 'communicate', 'leadership', 'conflict', 'resolution', 'manage', 'deliver'],
  product_manager: ['user', 'metric', 'kpi', 'roadmap', 'stakeholder', 'prioritize', 'customer', 'data-driven'],
  data_analyst: ['data', 'analysis', 'model', 'insight', 'metric', 'sql', 'statistical', 'visualization'],
};

// ─── DETECT FILLER WORDS ─────────────────────────────────────
const detectFillerWords = (text) => {
  const lower = text.toLowerCase();
  const found = [];
  FILLER_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) found.push(...matches);
  });
  return found;
};

// ─── STAR METHOD ANALYSIS ─────────────────────────────────────
const analyzeSTAR = (text) => {
  const lower = text.toLowerCase();
  const breakdown = {
    situation: STAR_KEYWORDS.situation.some(kw => lower.includes(kw)),
    task: STAR_KEYWORDS.task.some(kw => lower.includes(kw)),
    action: STAR_KEYWORDS.action.some(kw => lower.includes(kw)),
    result: STAR_KEYWORDS.result.some(kw => lower.includes(kw)),
  };
  const present = Object.values(breakdown).filter(Boolean).length;
  breakdown.score = Math.round((present / 4) * 100);
  return breakdown;
};

// ─── CLARITY SCORE ────────────────────────────────────────────
const calcClarityScore = (text) => {
  if (!text || text.trim().length < 10) return 0;

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 20) return 30; // Too short
  if (wordCount > 500) return 60; // Too long, rambling

  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : wordCount;
  let score = 70;

  // Ideal sentence length: 15-25 words
  if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 25) score += 15;
  else if (avgWordsPerSentence < 10) score += 5;
  else score -= 10;

  // Penalize filler words
  const fillers = detectFillerWords(text);
  const fillerRatio = fillers.length / wordCount;
  score -= Math.round(fillerRatio * 100);

  return Math.max(0, Math.min(100, score));
};

// ─── RELEVANCE SCORE ──────────────────────────────────────────
const calcRelevanceScore = (answerText, questionText, interviewType) => {
  if (!answerText || answerText.trim().length < 20) return 10;

  const lower = answerText.toLowerCase();
  const questionLower = questionText.toLowerCase();

  // Extract key words from question
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'how', 'what', 'when', 'where', 'why', 'you', 'your'];
  const questionKeywords = questionLower.split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.includes(w));

  const keywordsFound = questionKeywords.filter(kw => lower.includes(kw)).length;
  const keywordScore = questionKeywords.length > 0
    ? (keywordsFound / questionKeywords.length) * 40
    : 20;

  // Check domain keywords
  const domainKws = TECHNICAL_KEYWORDS[interviewType] || TECHNICAL_KEYWORDS.sde;
  const domainFound = domainKws.filter(kw => lower.includes(kw)).length;
  const domainScore = Math.min(40, domainFound * 8);

  // Length bonus (adequate response)
  const wordCount = answerText.trim().split(/\s+/).length;
  const lengthScore = wordCount >= 50 ? 20 : wordCount >= 30 ? 15 : wordCount >= 15 ? 10 : 0;

  return Math.max(0, Math.min(100, Math.round(keywordScore + domainScore + lengthScore)));
};

// ─── COMMUNICATION SCORE ─────────────────────────────────────
const calcCommunicationScore = (text) => {
  if (!text || text.trim().length < 10) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const fillers = detectFillerWords(text);

  let score = 75;

  // Filler word penalty
  const fillerRatio = fillers.length / wordCount;
  score -= Math.round(fillerRatio * 80);

  // Word variety
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const varietyRatio = uniqueWords / wordCount;
  if (varietyRatio > 0.6) score += 10;
  else if (varietyRatio < 0.4) score -= 10;

  // Connective words (shows structured thinking)
  const connectives = ['however', 'therefore', 'furthermore', 'additionally', 'consequently', 'for example', 'specifically', 'in conclusion', 'first', 'second', 'finally'];
  const connectivesUsed = connectives.filter(c => text.toLowerCase().includes(c)).length;
  score += Math.min(15, connectivesUsed * 3);

  return Math.max(0, Math.min(100, score));
};

// ─── SENTIMENT ANALYSIS (simple) ─────────────────────────────
const calcSentiment = (text) => {
  const positive = ['great', 'excellent', 'successfully', 'achieved', 'improved', 'solved', 'accomplished', 'proud', 'effective', 'innovative'];
  const negative = ['failed', 'difficult', 'struggled', 'problem', 'issue', 'challenge', 'hard', 'unfortunately'];

  const lower = text.toLowerCase();
  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;
  const total = posCount + negCount;

  if (total === 0) return 0;
  return parseFloat(((posCount - negCount) / total).toFixed(2));
};

// ─── GENERATE IDEAL ANSWER (placeholder) ─────────────────────
const generateIdealAnswer = (questionText, interviewType) => {
  // Placeholder — replace with AI call later
  const templates = {
    behavioral: `A strong answer would use the STAR method: Start by describing the Situation clearly, then explain the Task or challenge you faced, describe the specific Actions you took (using "I" statements), and conclude with the measurable Results or impact of your actions.`,
    technical: `A comprehensive technical answer would include: (1) Clear definition of the concept, (2) Real-world use cases, (3) Trade-offs and limitations, (4) Concrete examples from your experience, and (5) Best practices you follow.`,
    hr: `An effective HR answer is concise, honest, and professionally framed. Focus on growth, teamwork, and alignment with company values. Use specific examples to back your claims.`,
    system_design: `Cover: (1) Requirements clarification, (2) High-level architecture, (3) Database design, (4) API design, (5) Scalability considerations, (6) Trade-offs made.`,
  };

  const type = interviewType === 'sde' ? 'technical' : interviewType === 'hr' ? 'hr' : 'behavioral';
  return templates[type] || templates.behavioral;
};

// ─── GENERATE IMPROVEMENT SUGGESTIONS ────────────────────────
const generateSuggestions = (scores, fillerCount, starBreakdown, wordCount) => {
  const suggestions = [];

  if (scores.clarity < 60) suggestions.push('Structure your answers more clearly — use clear opening statements and logical flow.');
  if (scores.relevance < 60) suggestions.push('Stay more focused on what the question is actually asking. Address it directly before adding context.');
  if (scores.communication < 60) suggestions.push('Practice speaking without filler words like "um", "uh", "like". Record yourself to track progress.');
  if (scores.starMethod < 60) suggestions.push('Use the STAR method (Situation, Task, Action, Result) for behavioral questions.');
  if (!starBreakdown.result) suggestions.push('Always mention the outcome or result of your actions — this shows impact.');
  if (wordCount < 50) suggestions.push('Your answers are too brief. Aim for at least 100-150 words per answer with concrete examples.');
  if (wordCount > 400) suggestions.push('Try to be more concise — aim for 150-250 words per answer. Avoid rambling.');
  if (fillerCount > 5) suggestions.push(`You used ${fillerCount} filler words. Practice pausing silently instead of using filler words.`);

  return suggestions.slice(0, 4); // Max 4 suggestions
};

// ─── MAIN EVALUATION FUNCTION ─────────────────────────────────
const evaluateAnswer = (answer, question, interviewType) => {
  const text = answer.answerText || '';
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const fillerWords = detectFillerWords(text);
  const starBreakdown = analyzeSTAR(text);

  const scores = {
    clarity: calcClarityScore(text),
    relevance: calcRelevanceScore(text, question.text || '', interviewType),
    depth: Math.min(100, Math.round((wordCount / 200) * 70) + (starBreakdown.score * 0.3)),
    communication: calcCommunicationScore(text),
    starMethod: starBreakdown.score,
  };
  scores.overall = Math.round(
    scores.clarity * 0.25 + scores.relevance * 0.30 +
    scores.depth * 0.20 + scores.communication * 0.25
  );

  const sentimentScore = calcSentiment(text);
  const suggestions = generateSuggestions(scores, fillerWords.length, starBreakdown, wordCount);

  const strengths = [];
  if (scores.clarity >= 75) strengths.push('Clear and structured communication');
  if (scores.relevance >= 75) strengths.push('Answer is highly relevant to the question');
  if (starBreakdown.result) strengths.push('Good focus on outcomes and results');
  if (fillerWords.length < 3) strengths.push('Minimal filler words — confident delivery');
  if (wordCount >= 80 && wordCount <= 300) strengths.push('Good answer length with appropriate detail');

  return {
    scores,
    strengths,
    improvements: suggestions,
    idealAnswer: generateIdealAnswer(question.text, interviewType),
    fillerWordsDetected: [...new Set(fillerWords)],
    fillerWordCount: fillerWords.length,
    wordCount,
    avgWordsPerSentence: wordCount > 0 ? Math.round(wordCount / Math.max(1, text.split(/[.!?]+/).filter(s => s.trim()).length)) : 0,
    sentimentScore,
    starMethodBreakdown: starBreakdown,
  };
};

// ─── EVALUATE FULL SESSION ────────────────────────────────────
const evaluateSession = (answers, questions, interviewType) => {
  const answerFeedbacks = answers.map((answer, idx) => {
    const question = questions[idx] || questions[0];
    const evaluation = evaluateAnswer(answer, question, interviewType);
    return {
      questionId: answer.questionId || question?.questionId,
      questionText: answer.questionText || question?.text,
      userAnswer: answer.answerText,
      ...evaluation,
    };
  });

  // Aggregate scores
  const avgScore = (key) => {
    const vals = answerFeedbacks.map(f => f.scores[key]).filter(v => v !== undefined);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const overallScore = Math.round(answerFeedbacks.reduce((sum, f) => sum + f.scores.overall, 0) / Math.max(1, answerFeedbacks.length));
  const totalFillerWords = answerFeedbacks.reduce((sum, f) => sum + f.fillerWordCount, 0);
  const avgAnswerLength = Math.round(answerFeedbacks.reduce((sum, f) => sum + f.wordCount, 0) / Math.max(1, answerFeedbacks.length));

  // Session-level strengths and weaknesses
  const strengths = [];
  const weaknesses = [];

  const scores = {
    clarity: avgScore('clarity'),
    confidence: avgScore('communication'),
    relevance: avgScore('relevance'),
    communication: avgScore('communication'),
    technicalDepth: avgScore('depth'),
    starMethod: avgScore('starMethod'),
  };

  if (scores.clarity >= 70) strengths.push('Strong clarity and structure in answers');
  if (scores.communication >= 70) strengths.push('Confident communication style');
  if (scores.relevance >= 70) strengths.push('Answers are highly relevant and on-point');
  if (scores.starMethod >= 70) strengths.push('Effective use of STAR method');
  if (totalFillerWords < 10) strengths.push('Minimal filler words throughout the interview');

  if (scores.clarity < 60) weaknesses.push('Answer clarity needs improvement');
  if (scores.communication < 60) weaknesses.push('Work on reducing filler words and pacing');
  if (scores.relevance < 60) weaknesses.push('Some answers drifted off-topic');
  if (scores.starMethod < 50) weaknesses.push('Practice the STAR method for behavioral answers');
  if (avgAnswerLength < 50) weaknesses.push('Answers are too brief — provide more detail and examples');

  const recommendedTopics = [];
  if (scores.starMethod < 60) recommendedTopics.push('STAR Method Practice');
  if (scores.technicalDepth < 60) recommendedTopics.push('Technical Depth in Answers');
  if (scores.communication < 60) recommendedTopics.push('Communication & Delivery');
  if (scores.relevance < 60) recommendedTopics.push('Answer Structuring');

  const improvementSuggestions = [
    ...new Set(answerFeedbacks.flatMap(f => f.improvements))
  ].slice(0, 5);

  return {
    overallScore,
    scores,
    answerFeedbacks,
    strengths,
    weaknesses,
    improvementSuggestions,
    recommendedTopics,
    totalFillerWords,
    avgAnswerLength,
    answeredQuestions: answers.length,
  };
};

module.exports = { evaluateSession, evaluateAnswer, detectFillerWords, analyzeSTAR };
