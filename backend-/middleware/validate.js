const { body, validationResult } = require('express-validator');
const Joi = require('joi');

// ==================== EXPRESS-VALIDATOR SCHEMAS ====================

const registerValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required'),

  body('email')
    .isEmail()
    .withMessage('Valid email required'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must include lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must include uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must include special character'),

  // Fixed: .optional() does NOT support .withMessage()
  body('inviteCode').optional(),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Middleware to handle express-validator errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
    }));
    return res.status(400).json({
      success: false,
      errors: extractedErrors,
    });
  }
  next();
};

// ==================== JOI VALIDATION MIDDLEWARE ====================

const validateRequest = (schema) => {
  return (req, res, next) => {
    // Debug logs (optional — remove in production if needed)
    console.log('Validation middleware - Incoming req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.body type:', typeof req.body);
    console.log('Has students key?', 'students' in req.body);
    if ('students' in req.body) {
      console.log('Students value:', req.body.students);
      console.log('Students length:', req.body.students ? req.body.students.length : 'N/A');
      console.log('Is students array with min 1?', Array.isArray(req.body.students) && req.body.students.length >= 1);
    }
    console.log('Has archived key?', 'archived' in req.body);
    console.log('Archived value:', req.body.archived);

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    console.log('Validation result - Error?', !!error);
    if (error) {
      console.log('Full Joi error object:', JSON.stringify(error, null, 2));
      console.log('Error details array:', error.details.map(d => ({ path: d.path, message: d.message })));
    } else {
      console.log('Validated value:', JSON.stringify(value, null, 2));
    }

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
      }));
      console.error('Joi Validation Error:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
};

// ==================== JOI SCHEMAS ====================

const createSubjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  code: Joi.string().max(50).allow('').optional(),
  description: Joi.string().max(500).allow('').optional(),
  gradeLevel: Joi.number().integer().min(7).max(10).required(),
  academicYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .required()
    .messages({ 'string.pattern.base': 'Academic Year must be in YYYY-YYYY format (e.g., 2024-2025)' }),
  teacher: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  students: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional(),
});

console.log('Loading updateSubjectSchema...');
const updateSubjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Name must be at least 1 character',
    'string.max': 'Name must not exceed 100 characters',
  }),
  code: Joi.string().max(50).allow('').optional(),
  description: Joi.string().max(500).allow('').optional().messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  archived: Joi.boolean().optional().messages({
    'boolean.base': 'Archived must be a boolean',
  }),
  students: Joi.alternatives().try(
    null,
    Joi.array().length(0),
    Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1)
  ).optional().messages({
    'alternatives.base': 'Students must be null, an empty array, or an array of valid ObjectIds',
    'array.base': 'Students must be an array of valid ObjectIds',
    'string.pattern.base': 'Each student ID must be a valid MongoDB ObjectId',
    'array.min': 'Students array must have at least 1 item when provided',
  }),
  action: Joi.string().valid('add', 'remove').optional().when('students', {
    is: (students) => students && Array.isArray(students) && students.length > 0,
    then: (schema) => schema.required().messages({
      'any.required': 'Action (add or remove) is required when updating students',
      'string.base': 'Action must be a string',
      'any.only': 'Action must be either "add" or "remove"',
    }),
    otherwise: (schema) => schema.optional(),
  }),
  gradeLevel: Joi.number().integer().min(7).max(10).optional(),
  academicYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .optional()
    .messages({ 'string.pattern.base': 'Academic Year must be in YYYY-YYYY format (e.g., 2024-2025)' }),
  teacher: Joi.string().allow('').pattern(/^[0-9a-fA-F]{24}$/).optional(),
});
console.log('updateSubjectSchema loaded successfully.');

// ==================== EXPORTS ====================

module.exports = {
  registerValidation,
  loginValidation,
  handleValidationErrors,
  createSubjectSchema,
  updateSubjectSchema,
  validateRequest,
};