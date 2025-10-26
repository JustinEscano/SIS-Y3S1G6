const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Student = require('../models/Student');
const User = require('../models/User');

/**
 * Middleware: Verifies access token, attaches user/role to req.
 */
const verifyToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('🚫 No token provided for:', req.path);
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`🔍 Token decode success: ID ${decoded.id}, role ${decoded.role}`);

    const UserModel = decoded.role === 'student' ? Student : User;
    const user = await UserModel.findById(decoded.id).select('-password');

    if (!user) {
      console.warn(`🚫 User not found for token ID: ${decoded.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    req.role = decoded.role;

    // Exp remaining calc & log
    const expRemainingMs = (decoded.exp * 1000) - Date.now();
    console.log(`✅ Access token verify success for ID: ${decoded.id} role: ${decoded.role} - Exp remaining (ms): ${expRemainingMs}`);

    next();
  } catch (err) {
    console.error('❌ Token verification failed:', {
      path: req.path,
      error: err.name,
      message: err.message,
      tokenPreview: token.substring(0, 20) + '...'
    });
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

/**
 * Higher-order middleware: Requires one or more roles.
 * @param {...string|string[]} allowedRoles - e.g., 'student' or ['student', 'teacher']
 */
const requireRole = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.role) {
      console.warn('🚫 No role in req for:', req.path);
      return res.status(403).json({ message: 'Authentication required' });
    }

    let roles = allowedRoles.length === 1 && Array.isArray(allowedRoles[0])
  ? allowedRoles[0]  // Correct: Use 'allowedRoles'
  : allowedRoles;

    if (!roles.includes(req.role)) {
      console.warn('🚫 Access denied:', {
        path: req.path,
        required: roles,
        actual: req.role
      });
      return res.status(403).json({ 
        message: 'Insufficient permissions for this action',
        requiredRole: Array.isArray(roles) ? roles.join(', ') : roles
      });
    }

    console.log(`✅ Role check passed: ${req.role} for ${req.path}`);
    next();
  });
};

module.exports = { verifyToken, requireRole };