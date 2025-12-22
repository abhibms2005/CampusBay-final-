const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  college: { type: String }, // optional
  verified: { type: Boolean, default: false }, // verified student
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
