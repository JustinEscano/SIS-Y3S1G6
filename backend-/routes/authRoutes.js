const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { registerValidation, loginValidation, handleValidationErrors } = require('../middleware/validate');

router.post('/register', registerValidation, handleValidationErrors, register);
router.post('/login', loginValidation, handleValidationErrors, login);

module.exports = router;
