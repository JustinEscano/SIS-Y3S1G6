const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authMiddleware = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token' });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, payload) => {
      if (err) return res.status(401).json({ message: 'Invalid token' });
      const user = await User.findById(payload.id).select('-password');
      if (!user) return res.status(401).json({ message: 'User not found' });
      req.user = user;
      next();
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
