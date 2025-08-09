const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  url:{ type: String },
  body: { type: String, required: true },
  tags: [{ type: String, lowercase: true, trim: true }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  votesCount: { type: Number, default: 0 }, // calculated from Vote collection
  commentsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', questionSchema);
