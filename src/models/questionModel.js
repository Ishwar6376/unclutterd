const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true },
  tags: [{ type: String, lowercase: true, trim: true }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  votesCount: { type: Number, default: 0 }, // calculated from Vote collection
  answersCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', questionSchema);
