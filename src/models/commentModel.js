import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  parentType: { type: String, enum: ["Question", "Answer", "Comment"], required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Comment", commentSchema);
