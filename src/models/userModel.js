const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true }, // store hashed password
  avatarUrl: { type: String, default: '' },
  bio: { type: String, maxlength: 300 },
  karma: { type: Number, default: 0 }, // total points from posts & comments
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
