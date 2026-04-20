require('../../shared/load-env'); require('express-async-errors');
const express = require('express'); const cors = require('cors'); const helmet = require('helmet'); const cookieParser = require('cookie-parser'); const morgan = require('morgan');
const { connectDB } = require('./config/database');
const questionRoutes = require('./routes/question.routes');
const app = express(); const PORT = process.env.PORT || 4006;
app.use(helmet()); app.use(cors({ origin: process.env.CORS_ORIGIN?.split(','), credentials:true }));
app.use(cookieParser(process.env.COOKIE_SECRET)); app.use(express.json()); app.use(morgan('dev'));
app.get('/health', (req,res) => res.json({ status:'ok', service:'question-service' }));
app.use('/api/questions', questionRoutes);
app.use((err,req,res,next) => res.status(err.statusCode||500).json({ success:false, message:err.message||'Error' }));
async function start() {
  await connectDB();
  // Seed questions if empty
  const Question = require('./models/question.model');
  const count = await Question.countDocuments();
  if (count === 0) {
    await Question.insertMany([
      { text:'Tell me about yourself.', type:'hr', category:'introduction', difficulty:'easy', interviewType:'hr', tags:['intro','hr'], companies:['google','amazon'], keyPoints:['Background','Skills','Goals'] },
      { text:'What is the difference between SQL and NoSQL databases?', type:'technical', category:'database', difficulty:'medium', interviewType:'sde', tags:['database','sql','nosql'], companies:['amazon','microsoft'] },
      { text:'Explain the concept of closures in JavaScript.', type:'technical', category:'javascript', difficulty:'medium', interviewType:'sde', tags:['javascript','closures'], companies:['facebook','google'] },
      { text:'Describe a time you resolved a conflict in your team.', type:'behavioral', category:'conflict_resolution', difficulty:'medium', interviewType:'hr', tags:['behavioral','conflict'], companies:['amazon'] },
      { text:'How would you design a notification system for 100M users?', type:'system_design', category:'system_design', difficulty:'hard', interviewType:'sde', tags:['system-design','scalability'], companies:['google','facebook'] },
      { text:'What is the CAP theorem?', type:'technical', category:'distributed_systems', difficulty:'hard', interviewType:'sde', tags:['distributed','cap'], companies:['amazon'] },
      { text:'How do you prioritize features in your product roadmap?', type:'behavioral', category:'prioritization', difficulty:'medium', interviewType:'product_manager', tags:['product','prioritization'] },
      { text:'Explain REST API best practices.', type:'technical', category:'api', difficulty:'easy', interviewType:'sde', tags:['rest','api','http'], companies:['all'] },
      { text:'What are your salary expectations?', type:'hr', category:'compensation', difficulty:'easy', interviewType:'hr', tags:['salary','hr'] },
      { text:'Where do you see yourself in 5 years?', type:'hr', category:'goals', difficulty:'easy', interviewType:'hr', tags:['goals','career'], companies:['all'] },
    ]);
    console.log('✅ Questions seeded');
  }
  app.listen(PORT, () => console.log(`❓ Question Service on port ${PORT}`));
}
start();

// Extra seeding for CS subjects
const seedExtra = async () => {
  const Question = require('./models/question.model');
  const existing = await Question.countDocuments({ category: { $in: ['os','dbms','cn','oop'] } });
  if (existing > 0) return;
  await Question.insertMany([
    { text:'What is a deadlock and how can it be prevented?', type:'technical', category:'os', difficulty:'medium', interviewType:'sde', tags:['os','deadlock'], companies:['google','microsoft'] },
    { text:'Explain the difference between process and thread.', type:'technical', category:'os', difficulty:'easy', interviewType:'sde', tags:['os','threads'] },
    { text:'What is normalization? Explain 1NF, 2NF, 3NF.', type:'technical', category:'dbms', difficulty:'medium', interviewType:'sde', tags:['dbms','sql','normalization'] },
    { text:'What is an index in a database and when should you use it?', type:'technical', category:'dbms', difficulty:'medium', interviewType:'sde', tags:['dbms','index','performance'] },
    { text:'Explain TCP vs UDP. When would you use each?', type:'technical', category:'cn', difficulty:'medium', interviewType:'sde', tags:['networking','tcp','udp'] },
    { text:'What happens when you type www.google.com in a browser?', type:'technical', category:'cn', difficulty:'medium', interviewType:'sde', tags:['networking','dns','http'] },
    { text:'What are the four pillars of OOP? Explain with examples.', type:'technical', category:'oop', difficulty:'easy', interviewType:'sde', tags:['oop','java','design'] },
    { text:'What is the difference between abstraction and encapsulation?', type:'technical', category:'oop', difficulty:'medium', interviewType:'sde', tags:['oop','design'] },
    { text:'Explain SOLID principles with examples.', type:'technical', category:'oop', difficulty:'hard', interviewType:'sde', tags:['solid','design-patterns','oop'] },
    { text:'What is the difference between overloading and overriding?', type:'technical', category:'oop', difficulty:'easy', interviewType:'sde', tags:['oop','polymorphism'] },
  ]);
  console.log('✅ OS/DBMS/CN/OOP questions seeded');
};

// Call after main seed
setTimeout(seedExtra, 2000);
