// src/validators/employee.validator.js

import { body, param } from 'express-validator';
import mongoose from 'mongoose';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// ------------------- Create Employee Validation -------------------
export const validateCreateEmployee = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Employee name is required')
    .isLength({ max: 100 })
    .withMessage('Name can be up to 100 characters')
    .matches(/[a-zA-Z]/)
    .withMessage('Employee name must include at least one alphabet character'),

  body('email')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address'),

  body('phone_number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 7, max: 15 })
    .withMessage('Phone number must be between 7 and 15 digits')
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage('Invalid phone number'),

  body('age')
    .notEmpty()
    .withMessage('Age is required')
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),

  body('joining_date')
    .notEmpty()
    .withMessage('Joining date is required')
    .isISO8601()
    .toDate()
    .withMessage('Invalid joining date'),

  body('designation').trim().notEmpty().withMessage('Designation is required'),

  body('department_id')
    .notEmpty()
    .withMessage('Department is required')
    .custom((value) => isValidObjectId(value))
    .withMessage('Invalid department ID'),

  body('about_me')
    .trim()
    .notEmpty()
    .withMessage('About me is required')
    .isLength({ max: 500 })
    .withMessage('About me can be up to 500 characters'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 10, max: 300 })
    .withMessage('Address must be between 10 and 300 characters'),

  // Optional social links
  body('social_links.facebook')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isURL()
    .withMessage('Invalid Facebook URL'),

  body('social_links.twitter')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isURL()
    .withMessage('Invalid Twitter URL'),

  body('social_links.instagram')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isURL()
    .withMessage('Invalid Instagram URL'),

  body('social_links.youtube')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isURL()
    .withMessage('Invalid YouTube URL'),
];

// ------------------- Update Employee Validation -------------------
export const validateUpdateEmployee = [
  param('id').isMongoId().withMessage('Invalid employee ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Employee name is required')
    .isLength({ max: 100 })
    .withMessage('Name can be up to 100 characters')
    .matches(/[a-zA-Z]/)
    .withMessage('Employee name must include at least one alphabet character'),

  body('email')
    .optional()
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address'),

  body('phone_number')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 7, max: 15 })
    .withMessage('Phone number must be between 7 and 15 digits')
    .matches(/^\+?[0-9]{7,15}$/)
    .withMessage('Invalid phone number'),

  body('age')
    .optional()
    .notEmpty()
    .withMessage('Age is required')
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),

  body('joining_date')
    .optional()
    .notEmpty()
    .withMessage('Joining date is required')
    .isISO8601()
    .toDate()
    .withMessage('Invalid joining date'),

  body('designation').optional().trim().notEmpty().withMessage('Designation is required'),

  body('department_id')
    .optional()
    .notEmpty()
    .withMessage('Department is required')
    .custom((value) => isValidObjectId(value))
    .withMessage('Invalid department ID'),

  body('about_me')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('About me is required')
    .isLength({ max: 500 })
    .withMessage('About me can be up to 500 characters'),

  body('address')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 10, max: 300 })
    .withMessage('Address must be between 10 and 300 characters'),

  // Optional social links
  body('social_links.facebook')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isURL()
    .withMessage('Invalid Facebook URL'),

  body('social_links.twitter')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isURL()
    .withMessage('Invalid Twitter URL'),

  body('social_links.instagram')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isURL()
    .withMessage('Invalid Instagram URL'),

  body('social_links.youtube')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isURL()
    .withMessage('Invalid YouTube URL'),
];

// ------------------- Validate Employee ID Only -------------------
export const validateEmployeeId = [param('id').isMongoId().withMessage('Invalid employee ID')];
