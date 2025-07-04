import { body, param } from 'express-validator';

export const validateCreateAdmin = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name can be up to 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address'),

  body('phone_number')
    .trim()
    .notEmpty().withMessage('Phone number is required'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const validateUpdateAdmin = [
  param('id')
    .isMongoId().withMessage('Invalid admin ID'),

  body('full_name')
    .optional()
    .trim()
    .notEmpty().withMessage('Full name cannot be empty')
    .isLength({ max: 100 }).withMessage('Full name can be up to 100 characters'),

  body('email')
    .optional()
    .trim()
    .notEmpty().withMessage('Email cannot be empty')
    .isEmail().withMessage('Invalid email address'),

  body('phone_number')
    .optional()
    .trim()
    .notEmpty().withMessage('Phone number cannot be empty'),
];

export const validateAdminId = [
  param('id')
    .isMongoId().withMessage('Invalid admin ID'),
];
