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
    console.log('Validation middleware - Incoming req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.body type:', typeof req.body);
    console.log('Has subjectType key?', 'subjectType' in req.body);
    if ('subjectType' in req.body) {
      console.log('SubjectType value:', req.body.subjectType);
    }
    console.log('Has students key?', 'students' in req.body);
    console.log('Has archived key?', 'archived' in req.body);

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
    });

    console.log('Validation result - Error?', !!error);
    if (error) {
      console.log('Validation errors:', error.details.map(d => ({ path: d.path, message: d.message })));
    } else {
      console.log('Validated value:', JSON.stringify(value, null, 2));
    }

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    req.validatedData = value;
    next();
  };
};

// ==================== JOI SCHEMAS ====================

// UPDATED: Added subjectType to both schemas
const SUBJECT_TYPES = [
  'Math', 'Science', 'Social Sciences', 'English', 'MAPEH',
  'Computer Science', 'Filipino', 'Reading', 'TLE', 'Values', 'Other'
];

const createSubjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required()
    .messages({
      'string.empty': 'Subject name is required',
      'string.min': 'Subject name must be at least 1 character',
      'string.max': 'Subject name must not exceed 100 characters'
    }),
  code: Joi.string().max(50).allow('').optional(),
  description: Joi.string().max(500).allow('').optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  // NEW: Added subjectType validation
  subjectType: Joi.string().valid(...SUBJECT_TYPES).default('Other')
    .messages({
      'any.only': `Subject type must be one of: ${SUBJECT_TYPES.join(', ')}`
    }),
  gradeLevel: Joi.number().integer().min(7).max(10).required()
    .messages({
      'number.base': 'Grade level must be a number',
      'number.min': 'Grade level must be at least 7',
      'number.max': 'Grade level must be at most 10',
      'any.required': 'Grade level is required'
    }),
  academicYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .required()
    .messages({ 
      'string.pattern.base': 'Academic Year must be in YYYY-YYYY format (e.g., 2024-2025)',
      'any.required': 'Academic Year is required'
    }),
  teacher: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  students: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .optional()
    .messages({
      'array.base': 'Students must be an array',
      'string.pattern.base': 'Each student ID must be a valid MongoDB ObjectId'
    }),
});

const updateSubjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional()
    .messages({
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name must not exceed 100 characters',
    }),
  code: Joi.string().max(50).allow('').optional(),
  description: Joi.string().max(500).allow('').optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  // NEW: Added subjectType validation for updates
  subjectType: Joi.string().valid(...SUBJECT_TYPES).optional()
    .messages({
      'any.only': `Subject type must be one of: ${SUBJECT_TYPES.join(', ')}`
    }),
  archived: Joi.boolean().optional()
    .messages({
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
  gradeLevel: Joi.number().integer().min(7).max(10).optional()
    .messages({
      'number.base': 'Grade level must be a number',
      'number.min': 'Grade level must be at least 7',
      'number.max': 'Grade level must be at most 10'
    }),
  academicYear: Joi.string()
    .pattern(/^\d{4}-\d{4}$/)
    .optional()
    .messages({ 
      'string.pattern.base': 'Academic Year must be in YYYY-YYYY format (e.g., 2024-2025)' 
    }),
  teacher: Joi.string().allow('').pattern(/^[0-9a-fA-F]{24}$/).optional(),
});

// ==================== EXPORTS ====================

module.exports = {
  registerValidation,
  loginValidation,
  handleValidationErrors,
  createSubjectSchema,
  updateSubjectSchema,
  validateRequest,
  SUBJECT_TYPES // Export for use in controllers if needed
};