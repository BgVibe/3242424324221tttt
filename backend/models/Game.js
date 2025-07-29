const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  title: String,
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  thumbnail: String,
  filePath: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Game', gameSchema);
