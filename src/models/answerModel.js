const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  votesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  isAccepted: { type: Boolean, default: false }, // accepted answer indicator
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Answer', answerSchema);
