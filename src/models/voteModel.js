import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  parentType: { type: String, enum: ["Question", "Answer"], required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  value: { type: Number, enum: [1, -1], required: true } // 1 = upvote, -1 = downvote
});

voteSchema.index({ user: 1, parentType: 1, parentId: 1 }, { unique: true });

export default mongoose.model("Vote", voteSchema);
 