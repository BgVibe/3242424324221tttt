const express = require('express');
const User = require('../models/User');
const Game = require('../models/Game');
const isAdmin = require('../middleware/adminMiddleware');
const router = express.Router();

// Get all users
router.get('/users', isAdmin, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Delete user
router.delete('/users/:id', isAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

// Get all games
router.get('/games', isAdmin, async (req, res) => {
  const games = await Game.find();
  res.json(games);
});

// Delete game
router.delete('/games/:id', isAdmin, async (req, res) => {
  await Game.findByIdAndDelete(req.params.id);
  res.json({ message: 'Game deleted' });
});

// Award badge to user
router.post('/users/:id/badges', isAdmin, async (req, res) => {
  const { badge } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.badges.includes(badge)) {
    user.badges.push(badge);
    await user.save();
  }
  res.json({ message: 'Badge awarded' });
});

module.exports = router;
