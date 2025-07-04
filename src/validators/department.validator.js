import { body, param } from 'express-validator';

export const validateCreateDepartment = [
  body('name')
    .trim()
    .notEmpty().withMessage('Department name is required')
    .isLength({ max: 100 }).withMessage('Name can be up to 100 characters')
    .matches(/[a-zA-Z]/).withMessage('Department name must include at least one alphabet character'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address'),
];

export const validateUpdateDepartment = [
  param('id')
    .isMongoId().withMessage('Invalid department ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Department name is required')
    .isLength({ max: 100 }).withMessage('Name can be up to 100 characters')
    .matches(/[a-zA-Z]/).withMessage('Department name must include at least one alphabet character'),

  body('email')
    .optional()
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address'),
];

export const validateDepartmentId = [
  param('id')
    .isMongoId().withMessage('Invalid department ID'),
];
