// routes/authRoutes.js (Refactored: Added refresh route, no auth middleware for refresh)
const express = require('express');
const router = express.Router();
const { login, refreshToken } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware'); // For protected routes if needed

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh (No middleware - public for expired tokens)
router.post('/refresh', refreshToken);

// Optional: Logout (invalidate token - add blacklist if needed)
router.post('/logout', verifyToken, (req, res) => {
  // Add to blacklist (e.g., Redis) here
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;