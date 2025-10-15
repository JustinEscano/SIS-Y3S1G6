const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const User = require('../models/User');

// ---------------- VERIFY TOKEN ----------------
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user depending on role
    let user =
      decoded.role === 'student'
        ? await Student.findById(decoded.id).select('-password')
        : await User.findById(decoded.id).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    // attach user info to request for downstream use
    req.user = user;
    req.role = decoded.role;

    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// ---------------- ROLE CHECKER ----------------
exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res
        .status(403)
        .json({ message: 'You do not have permission for this action' });
    }
    next();
  };
};
