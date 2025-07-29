const express = require('express');
const multer = require('multer');
const path = require('path');
const Game = require('../models/Game');
const isAuthenticated = require('../middleware/authMiddleware');
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'thumbnail') cb(null, 'uploads/thumbnails/');
    else if (file.fieldname === 'gamefile') cb(null, 'uploads/games/');
    else cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Create new game
router.post('/', isAuthenticated, upload.fields([{ name: 'thumbnail' }, { name: 'gamefile' }]), async (req, res) => {
  try {
    const { title, description } = req.body;
    const thumbnail = req.files['thumbnail'] ? req.files['thumbnail'][0].path : '';
    const gamefile = req.files['gamefile'] ? req.files['gamefile'][0].path : '';
    if (!title || !description || !thumbnail || !gamefile) {
      return res.status(400).json({ error: 'Missing fields or files' });
    }
    const game = new Game({
      title,
      description,
      creator: req.user._id,
      thumbnail,
      filePath: gamefile,
    });
    await game.save();
    res.json({ message: 'Game created', gameId: game._id });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all games
router.get('/', async (req, res) => {
  const games = await Game.find().populate('creator', 'username');
  res.json(games);
});

// Get single game by ID
router.get('/:id', async (req, res) => {
  const game = await Game.findById(req.params.id).populate('creator', 'username');
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

module.exports = router;
