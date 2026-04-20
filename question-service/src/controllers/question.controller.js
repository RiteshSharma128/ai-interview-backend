const Question = require('../models/question.model');

exports.getQuestions = async (req, res) => {
  const { page=1, limit=20, type, difficulty, category, interviewType, company, tag, search, random } = req.query;
  const filter = { isActive: true };
  if (type) filter.type = type;
  if (difficulty) filter.difficulty = difficulty;
  if (category) filter.category = category;
  if (interviewType) filter.interviewType = interviewType;
  if (company) filter.companies = { $in: [company.toLowerCase()] };
  if (tag) filter.tags = { $in: [tag] };
  if (search) filter.$text = { $search: search };
  if (random === 'true') {
    const count = await Question.countDocuments(filter);
    const skip = Math.floor(Math.random() * Math.max(0, count - parseInt(limit)));
    const questions = await Question.find(filter).skip(skip).limit(parseInt(limit)).lean();
    return res.json({ success: true, questions, total: count });
  }
  const skip = (parseInt(page)-1)*parseInt(limit);
  const [questions, total] = await Promise.all([
    Question.find(filter).sort({ createdAt:-1 }).skip(skip).limit(parseInt(limit)).lean(),
    Question.countDocuments(filter)
  ]);
  res.json({ success:true, questions, pagination:{ page:parseInt(page), limit:parseInt(limit), total, pages:Math.ceil(total/parseInt(limit)) } });
};

exports.getQuestion = async (req, res) => {
  const q = await Question.findByIdAndUpdate(req.params.id, { $inc:{ views:1 } }, { new:true }).lean();
  if (!q) return res.status(404).json({ success:false, message:'Question not found' });
  res.json({ success:true, question:q });
};

exports.createQuestion = async (req, res) => {
  const q = new Question({ ...req.body, createdBy: req.user?.id });
  await q.save();
  res.status(201).json({ success:true, question:q });
};

exports.upvoteQuestion = async (req, res) => {
  await Question.findByIdAndUpdate(req.params.id, { $inc:{ upvotes:1 } });
  res.json({ success:true, message:'Upvoted' });
};

exports.getCategories = async (req, res) => {
  const cats = await Question.distinct('category');
  const types = await Question.distinct('type');
  res.json({ success:true, categories:cats, types });
};

exports.getRandomQuestion = async (req, res) => {
  const { interviewType='general', difficulty } = req.query;
  const filter = { isActive:true, interviewType };
  if (difficulty) filter.difficulty = difficulty;
  const count = await Question.countDocuments(filter);
  const skip = Math.floor(Math.random()*count);
  const q = await Question.findOne(filter).skip(skip).lean();
  res.json({ success:true, question:q });
};
