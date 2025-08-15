import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  image:{type:String},
  description: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
},{timestamps:true});
export default mongoose.models.Question || mongoose.model("Question", questionSchema);
