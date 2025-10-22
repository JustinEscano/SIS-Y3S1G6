const { body, validationResult } = require('express-validator');
const Joi = require('joi');

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must include lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must include uppercase letter')
    .matches(/[0-9]/).withMessage('Password must include number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must include special character'),
  body('inviteCode').notEmpty().withMessage('Invite code is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Middleware to send errors to frontend
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => err.msg);
    return res.status(400).json({ errors: extractedErrors });
  }
  next();
};

// subject schema
const createSubjectSchema = Joi.object({
  name: Joi.string().required().max(100),
  description: Joi.string().max(500),
  gradeLevel: Joi.number().integer().min(1).max(12).required(),
  schoolYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required(), // e.g., 2024-2025
  students: Joi.array().items(Joi.string()) // ObjectIds as strings
});

const updateSubjectSchema = Joi.object({
  name: Joi.string().max(100),
  description: Joi.string().max(500),
  gradeLevel: Joi.number().integer().min(1).max(12),
  schoolYear: Joi.string().pattern(/^\d{4}-\d{4}$/),
  students: Joi.array().items(Joi.string()).optional(),
  action: Joi.string().valid('add', 'remove').when('students', { is: Joi.exist(), then: Joi.required() }),
  archived: Joi.boolean()
});

module.exports = {
  registerValidation,
  loginValidation,
  handleValidationErrors,
  createSubjectSchema, 
  updateSubjectSchema
};
