const { Post } = require('../models/community.model');

exports.getPosts = async (req, res) => {
  const { page=1, limit=15, category, tag, search, sort='latest' } = req.query;
  const filter = { isActive:true };
  if (category) filter.category = category;
  if (tag) filter.tags = { $in: [tag] };
  if (search) filter.$text = { $search: search };
  const sortMap = { latest:{ isPinned:-1, createdAt:-1 }, popular:{ isPinned:-1, upvotes:-1 }, views:{ views:-1 } };
  const skip = (parseInt(page)-1)*parseInt(limit);
  const [posts, total] = await Promise.all([
    Post.find(filter).select('-comments').sort(sortMap[sort]||sortMap.latest).skip(skip).limit(parseInt(limit)).lean(),
    Post.countDocuments(filter),
  ]);
  res.json({ success:true, posts, pagination:{ page:parseInt(page), total, pages:Math.ceil(total/parseInt(limit)) } });
};

exports.getPost = async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.id, { $inc:{views:1} }, { new:true }).lean();
  if (!post) return res.status(404).json({ success:false, message:'Post not found' });
  res.json({ success:true, post });
};

exports.createPost = async (req, res) => {
  const { title, content, category, tags } = req.body;
  const post = new Post({ userId:req.user.id, userName:req.user.name||'User', title, content, category, tags });
  await post.save();
  res.status(201).json({ success:true, post });
};

exports.upvotePost = async (req, res) => {
  const userId = req.user.id;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ success:false, message:'Post not found' });
  const alreadyUpvoted = post.upvotedBy.includes(userId);
  if (alreadyUpvoted) {
    post.upvotes = Math.max(0, post.upvotes - 1);
    post.upvotedBy = post.upvotedBy.filter(id => id !== userId);
  } else {
    post.upvotes += 1;
    post.upvotedBy.push(userId);
  }
  await post.save();
  res.json({ success:true, upvotes:post.upvotes, isUpvoted:!alreadyUpvoted });
};

exports.addComment = async (req, res) => {
  const { content } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ success:false, message:'Post not found' });
  post.comments.push({ userId:req.user.id, userName:req.user.name||'User', content });
  await post.save();
  res.status(201).json({ success:true, comment: post.comments[post.comments.length-1] });
};

exports.deletePost = async (req, res) => {
  const post = await Post.findOne({ _id:req.params.id, userId:req.user.id });
  if (!post) return res.status(404).json({ success:false, message:'Not found or unauthorized' });
  post.isActive = false;
  await post.save();
  res.json({ success:true, message:'Post deleted' });
};
