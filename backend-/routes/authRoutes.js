const express = require('express');
const router = express.Router();
const { register, login, refreshToken } = require('../controllers/authController'); // Added refreshToken
const { registerValidation, loginValidation, handleValidationErrors } = require('../middleware/validate');

router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);

// ✅ New: Refresh endpoint (no validation needed, as it's token-only)
router.post('/refresh', refreshToken);

module.exports = router;