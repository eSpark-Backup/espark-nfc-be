import { body } from 'express-validator';

export const reenteredPasswordValidator = [
  body('password').trim().notEmpty().withMessage('Password is required to confirm this action'),
];
