const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  avatar: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
  badges: [{ type: String }],
  currency: { type: Number, default: 1000 },
  inventory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
});

module.exports = mongoose.model('User', userSchema);
