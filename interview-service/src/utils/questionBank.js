const { v4: uuidv4 } = require('uuid');

// ─── STATIC QUESTION BANK ─────────────────────────────────────
// In production: fetch from question-service via internal API
const QUESTIONS = {
  sde: {
    easy: [
      { text: 'Tell me about yourself and your programming background.', type: 'behavioral', category: 'introduction' },
      { text: 'What programming languages are you most comfortable with?', type: 'technical', category: 'skills' },
      { text: 'Explain the difference between a stack and a queue.', type: 'technical', category: 'data_structures' },
      { text: 'What is OOP and its main principles?', type: 'technical', category: 'oop' },
      { text: 'What is the difference between HTTP and HTTPS?', type: 'technical', category: 'networking' },
    ],
    medium: [
      { text: 'Describe a challenging technical problem you solved and your approach.', type: 'behavioral', category: 'problem_solving' },
      { text: 'Explain the difference between REST and GraphQL.', type: 'technical', category: 'api' },
      { text: 'How would you design a URL shortener like bit.ly?', type: 'technical', category: 'system_design' },
      { text: 'What is database indexing and when would you use it?', type: 'technical', category: 'database' },
      { text: 'Explain the CAP theorem.', type: 'technical', category: 'distributed_systems' },
      { text: 'How do you handle merge conflicts in Git?', type: 'technical', category: 'git' },
    ],
    hard: [
      { text: 'Design a distributed cache system like Redis from scratch.', type: 'technical', category: 'system_design' },
      { text: 'How would you scale a web application to handle 10 million users?', type: 'technical', category: 'system_design' },
      { text: 'Explain the internal workings of a hash map.', type: 'technical', category: 'data_structures' },
      { text: 'What are microservices and when would you NOT use them?', type: 'technical', category: 'architecture' },
      { text: 'How does garbage collection work in your preferred language?', type: 'technical', category: 'internals' },
    ],
  },
  hr: {
    easy: [
      { text: 'Tell me about yourself.', type: 'hr', category: 'introduction' },
      { text: 'Why do you want to join our company?', type: 'hr', category: 'motivation' },
      { text: 'Where do you see yourself in 5 years?', type: 'hr', category: 'goals' },
      { text: 'What are your greatest strengths?', type: 'hr', category: 'self_assessment' },
      { text: 'What are your weaknesses?', type: 'hr', category: 'self_assessment' },
    ],
    medium: [
      { text: 'Tell me about a time you had a conflict with a colleague. How did you resolve it?', type: 'behavioral', category: 'conflict_resolution' },
      { text: 'Describe a situation where you had to meet a tight deadline.', type: 'behavioral', category: 'time_management' },
      { text: 'Give an example of when you showed leadership.', type: 'behavioral', category: 'leadership' },
      { text: 'How do you handle failure?', type: 'behavioral', category: 'resilience' },
      { text: 'What motivates you at work?', type: 'hr', category: 'motivation' },
    ],
    hard: [
      { text: 'Tell me about the biggest professional failure you have experienced and what you learned.', type: 'behavioral', category: 'failure' },
      { text: 'How would you handle disagreement with your manager about a key decision?', type: 'behavioral', category: 'conflict' },
      { text: 'Describe a situation where you had to influence without authority.', type: 'behavioral', category: 'influence' },
    ],
  },
  product_manager: {
    medium: [
      { text: 'How would you improve WhatsApp?', type: 'technical', category: 'product_improvement' },
      { text: 'How do you prioritize features when everything seems important?', type: 'behavioral', category: 'prioritization' },
      { text: 'Define success metrics for a new feature.', type: 'technical', category: 'metrics' },
      { text: 'How would you design an app for elderly users?', type: 'technical', category: 'product_design' },
      { text: 'Tell me about a product you admire and why.', type: 'behavioral', category: 'product_sense' },
    ],
    hard: [
      { text: 'How would you decide whether to build, buy, or partner for a key capability?', type: 'technical', category: 'strategy' },
      { text: 'Design a recommendation system for an e-commerce platform.', type: 'technical', category: 'product_design' },
    ],
  },
  data_analyst: {
    medium: [
      { text: 'Explain the difference between supervised and unsupervised learning.', type: 'technical', category: 'ml' },
      { text: 'How would you handle missing data in a dataset?', type: 'technical', category: 'data_cleaning' },
      { text: 'What is A/B testing and how would you set one up?', type: 'technical', category: 'experimentation' },
      { text: 'Explain the concept of overfitting and how to prevent it.', type: 'technical', category: 'ml' },
      { text: 'What SQL query would you use to find the top 5 customers by revenue?', type: 'technical', category: 'sql' },
    ],
  },
};

// Company-specific follow-up tendencies
const COMPANY_FOLLOW_UPS = {
  google: ['How would you scale this to global usage?', 'What are the edge cases you would handle?'],
  amazon: ['How does this align with customer obsession?', 'Tell me more using the STAR method.'],
  microsoft: ['How would you collaborate with other teams on this?', 'What would you do differently next time?'],
  meta: ['How would you measure the impact of this?', 'How does this affect the user experience?'],
};

// ─── GET QUESTIONS BY TYPE ────────────────────────────────────
const getQuestionsByType = async ({ interviewType, difficulty, targetCompany, totalQuestions }) => {
  const bank = QUESTIONS[interviewType] || QUESTIONS.sde;
  const pool = bank[difficulty] || bank.medium || Object.values(bank).flat();

  // Shuffle
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(totalQuestions, pool.length));

  // Add company follow-ups if applicable
  const companyKey = targetCompany?.toLowerCase();
  const followUps = COMPANY_FOLLOW_UPS[companyKey] || [
    'Can you elaborate on that?',
    'What was the outcome?',
    'What would you do differently?',
  ];

  return selected.map((q, index) => ({
    questionId: uuidv4(),
    text: q.text,
    type: q.type,
    difficulty,
    category: q.category,
    followUps: followUps.slice(0, 2),
    expectedKeyPoints: [],
    order: index + 1,
  }));
};

module.exports = { getQuestionsByType };
