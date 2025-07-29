require('dotenv').config();  // Load environment variables from .env file

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Schemas

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
  badges: [{ type: String }],
  currency: { type: Number, default: 1000 },
  inventory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
});

const gameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  thumbnail: { type: String, required: true },
  filePath: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  type: { type: String, required: true }, // e.g., "hat", "shirt"
});

const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);
const Item = mongoose.model('Item', itemSchema);

// Middleware setup
app.use(cors({
  origin: 'http://localhost:5500', // Change this to your frontend URL
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 }, // 1 day
}));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage config for uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (file.fieldname === 'thumbnail') cb(null, 'uploads/thumbnails/');
    else if (file.fieldname === 'gamefile') cb(null, 'uploads/games/');
    else cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Auth middleware
function isAuthenticated(req, res, next) {
  if (req.session.userId) next();
  else res.status(401).json({ error: 'Not authenticated' });
}

async function isAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = await User.findById(req.session.userId);
  if (user && user.isAdmin) next();
  else res.status(403).json({ error: 'Forbidden' });
}

// Routes

// Signup
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username taken' });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    req.session.userId = user._id;
    res.json({ message: 'Signup successful', userId: user._id, username });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    req.session.userId = user._id;
    res.json({ message: 'Login successful', userId: user._id, username });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// Get profile info
app.get('/api/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('inventory');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      username: user.username,
      avatar: user.avatar,
      badges: user.badges,
      currency: user.currency,
      inventory: user.inventory,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update avatar
app.post('/api/avatar', isAuthenticated, async (req, res) => {
  try {
    const { avatar } = req.body;
    await User.findByIdAndUpdate(req.session.userId, { avatar });
    res.json({ message: 'Avatar updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Marketplace - get items
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Marketplace - buy item
app.post('/api/items/buy/:itemId', isAuthenticated, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const user = await User.findById(req.session.userId);
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (user.currency < item.price) return res.status(400).json({ error: 'Insufficient funds' });
    if (user.inventory.includes(item._id)) return res.status(400).json({ error: 'Already owned' });
    user.currency -= item.price;
    user.inventory.push(item._id);
    await user.save();
    res.json({ message: 'Item purchased', currency: user.currency });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create game (upload thumbnail and game file)
app.post('/api/games', isAuthenticated, upload.fields([{ name: 'thumbnail' }, { name: 'gamefile' }]), async (req, res) => {
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
      creator: req.session.userId,
      thumbnail,
      filePath: gamefile,
    });
    await game.save();
    res.json({ message: 'Game created', gameId: game._id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all games
app.get('/api/games', async (req, res) => {
  try {
    const games = await Game.find().populate('creator', 'username');
    res.json(games);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single game
app.get('/api/games/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).populate('creator', 'username');
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin routes (requires admin)

// Get all users
app.get('/api/admin/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Ban user (delete user)
app.delete('/api/admin/users/:id', isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all games (admin)
app.get('/api/admin/games', isAdmin, async (req, res) => {
  try {
    const games = await Game.find();
    res.json(games);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete game
app.delete('/api/admin/games/:id', isAdmin, async (req, res) => {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.json({ message: 'Game deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Award badge to user
app.post('/api/admin/users/:id/badges', isAdmin, async (req, res) => {
  try {
    const { badge } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.badges.includes(badge)) {
      user.badges.push(badge);
      await user.save();
    }
    res.json({ message: 'Badge awarded' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Zentrix backend running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Zentrix backend is running.');
});
