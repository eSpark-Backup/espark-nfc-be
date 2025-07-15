import express from 'express';
import { login } from '../controllers/auth.controller.js';
import validateRequest from '../middlewares/validateRequest.js';
import { validateLogin } from '../validators/auth.validator.js';
import { loginRateLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// Login Route
router.route('/login').post(loginRateLimiter, validateLogin, validateRequest, login);

export default router;
