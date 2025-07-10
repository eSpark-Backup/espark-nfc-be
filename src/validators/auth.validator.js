import { body } from 'express-validator';

export const validateLogin = [
  // ✅ Email: required, valid format, normalized
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  // ✅ Password: required, minimum length
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];
