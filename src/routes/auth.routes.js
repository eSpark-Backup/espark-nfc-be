import express from 'express';
import { login } from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { validateLogin } from '../validators/auth.validator.js';
import { loginRateLimiter } from '../middlewares/rateLimiters.js';

export const authRoutes = express.Router();

// Login Route
authRoutes.route('/login').post(loginRateLimiter, validateLogin, validateRequest, login);