const voteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['Question', 'Answer', 'Comment'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  voteType: { type: Number, enum: [1, -1], required: true }, // 1 for upvote, -1 for downvote
  createdAt: { type: Date, default: Date.now }
});

// Ensure one user can vote only once per target
voteSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
