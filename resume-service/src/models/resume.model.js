const mongoose = require('mongoose');
const ResumeSchema = new mongoose.Schema({
  userId: { type:String, required:true, index:true },
  name: String,
  email: String,
  phone: String,
  summary: String,
  skills: [String],
  experience: [{ title:String, company:String, duration:String, description:String }],
  education: [{ degree:String, institution:String, year:String }],
  projects: [{ name:String, description:String, tech:[String], url:String }],
  resumeUrl: String,
  atsScore: { type:Number, default:0 },
  atsFeedback: [String],
  template: { type:String, default:'modern' },
  isPublic: { type:Boolean, default:false },
}, { timestamps:true });
module.exports = { Resume: mongoose.model('Resume', ResumeSchema) };
