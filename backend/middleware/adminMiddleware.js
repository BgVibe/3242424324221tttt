const User = require('../models/User');

async function isAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = await User.findById(req.session.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  req.user = user;
  next();
}

module.exports = isAdmin;
