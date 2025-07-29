const express = require('express');
const Item = require('../models/Item');
const User = require('../models/User');
const isAuthenticated = require('../middleware/authMiddleware');
const router = express.Router();

// Get all items
router.get('/', async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

// Buy an item
router.post('/buy/:itemId', isAuthenticated, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const user = await User.findById(req.user._id);
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (user.currency < item.price) return res.status(400).json({ error: 'Insufficient funds' });
    if (user.inventory.includes(item._id)) return res.status(400).json({ error: 'Already owned' });
    user.currency -= item.price;
    user.inventory.push(item._id);
    await user.save();
    res.json({ message: 'Item purchased', currency: user.currency });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
