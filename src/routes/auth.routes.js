import express from 'express';
import { login } from '../controllers/auth.controller.js';
import validateRequest from '../middlewares/validateRequest.js';
import { validateLogin } from '../validators/auth.validator.js';

const router = express.Router();

// 🔐 Login Route
router.post('/login', validateLogin, validateRequest, login);

export default router;
