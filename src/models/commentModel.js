const commentSchema = new mongoose.Schema({
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Either linked to a Question, Answer, or another Comment
  parentType: { 
    type: String, 
    enum: ['Question', 'Answer', 'Comment'], 
    required: true 
  },
  parentId: { type: mongoose.Schema.Types.ObjectId, required: true },

  // Optional nesting
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },

  votesCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
