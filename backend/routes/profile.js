const express = require('express');
const User = require('../models/User');
const isAuthenticated = require('../middleware/authMiddleware');
const router = express.Router();

// Get profile info
router.get('/', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.user._id).populate('inventory');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    username: user.username,
    avatar: user.avatar,
    badges: user.badges,
    currency: user.currency,
    inventory: user.inventory
  });
});

// Update avatar
router.post('/avatar', isAuthenticated, async (req, res) => {
  const { avatar } = req.body;
  await User.findByIdAndUpdate(req.user._id, { avatar });
  res.json({ message: 'Avatar updated' });
});

module.exports = router;
