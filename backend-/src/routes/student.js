const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../utils/auth');

router.get('/me', authMiddleware, async (req, res) => {
  // req.user is populated by authMiddleware
  res.json({ user: req.user });
});

module.exports = router;
