import { timeStamp } from "console";
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  image:{type:[String],default:[]},
  tags: [{ type: String }],
  isAnswered: { type: Boolean, default: false },
  votes: { type: Number, default: 0 },
}
,{ timestamps: true }
);

export default mongoose.models.Question || mongoose.model("Question", questionSchema);
