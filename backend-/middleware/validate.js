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
const updateSubjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).allow('').optional(),
  gradeLevel: Joi.number().integer().min(7).max(12).optional(),
  academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).optional(),
  archived: Joi.boolean().optional(),
  students: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),  // Optional, validates as ObjectId strings
  action: Joi.string().valid('add', 'remove').when('students', {  // Per-field conditional
    is: Joi.array().min(1),  // Trigger if students exists and has ≥1 item
    then: Joi.required(),
    otherwise: Joi.optional().allow(null, '')  // Allow missing/empty for simple edits
  })
});

const createSubjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow('').optional(),
  gradeLevel: Joi.number().integer().min(7).max(12).required(),
  academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
  students: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional()
});

module.exports = { createSubjectSchema, updateSubjectSchema };

module.exports = {
  registerValidation,
  loginValidation,
  handleValidationErrors,
  createSubjectSchema, 
  updateSubjectSchema
};
