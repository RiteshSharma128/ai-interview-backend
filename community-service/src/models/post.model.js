const mongoose = require('mongoose');
const CommentSchema = new mongoose.Schema({ userId:String, userName:String, userAvatar:String, text:String, upvotes:[String], createdAt:{type:Date,default:Date.now} });
const PostSchema = new mongoose.Schema({
  userId:{type:String,required:true,index:true}, userName:String, userAvatar:String,
  title:{type:String,required:true}, content:{type:String,required:true},
  type:{type:String,enum:['discussion','question','experience','tip'],default:'discussion'},
  tags:[String], upvotes:[String], downvotes:[String], comments:[CommentSchema],
  views:{type:Number,default:0}, isPinned:{type:Boolean,default:false}, isActive:{type:Boolean,default:true},
},{ timestamps:true });
PostSchema.index({ createdAt:-1 }); PostSchema.index({ tags:1 });
module.exports = mongoose.model('Post', PostSchema);
