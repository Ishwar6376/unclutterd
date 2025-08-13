import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  image:{type:String},
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tags: [{ type: String }],
  votes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Question", questionSchema);
