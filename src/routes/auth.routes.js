import express from 'express';
import { login } from '../controllers/auth.controller.js';
import validateRequest from '../middlewares/validateRequest.js';
import { body } from 'express-validator';

const router = express.Router();

router
  .route('/login')
  .post(
    [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password').notEmpty().withMessage('Password is required'),
    ],
    validateRequest,
    login
  );

export default router;
