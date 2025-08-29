import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    questionId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Question",
      required:true

    },
    parentId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Comment",
      required:true
    },
    author:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true
    },
    votes:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Vote"
    },
    body:{
      type:String,
      trim:true,
      required:true,
    }

,},{timestamps:true});

export default mongoose.models.Comment||mongoose.model("Comment", commentSchema);