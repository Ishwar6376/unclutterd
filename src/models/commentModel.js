
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
      default:null,
    },
    author:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
      required:true
    },
    votes:{
      type:Number,
      default:0,
    },
    body:{
      type:String,
      trim:true,
      required:true,
    },
    replyCount:{
      type:Number,
      default:0,
    }

,},{timestamps:true});

export default mongoose.models.Comment||mongoose.model("Comment", commentSchema);