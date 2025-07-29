const User = require('../models/User');

async function isAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = user;
  next();
}

module.exports = isAuthenticated;
