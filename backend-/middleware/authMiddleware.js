// middleware/authMiddleware.js (Fixed: Wrapped requireRole in asyncHandler for consistency, ensured proper exports)
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const User = require('../models/User');

// ---------------- VERIFY TOKEN ----------------
exports.verifyToken = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    console.log('🔑 Verify attempt for endpoint:', req.path, '- Token preview:', token.substring(0, 20) + '...'); // Debug: Track which requests hit verify

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Access token verify success for ID:', decoded.id, 'role:', decoded.role, // Debug: Valid access details
      '- Exp remaining (ms):', (decoded.exp * 1000) - Date.now()); // Debug: Time left before expiry

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
    console.error('❌ Token verification failed for', req.path, ':', err.name, '-', err.message, // Enhanced: Include endpoint & error type
      '- Token preview:', (req.headers.authorization ? req.headers.authorization.split(' ')[1]?.substring(0, 20) + '...' : 'N/A')); // Debug: Which token & where
    res.status(403).json({ message: 'Invalid or expired token' });
  }
});

// ---------------- ROLE CHECKER ----------------
exports.requireRole = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res
        .status(403)
        .json({ message: 'You do not have permission for this action' });
    }
    next();
  });
};

// Ensure proper CommonJS export
module.exports = {
  verifyToken: exports.verifyToken,
  requireRole: exports.requireRole
};