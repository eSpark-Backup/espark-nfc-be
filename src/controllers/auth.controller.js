import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { generateToken } from '../utils/token.js';
import bcrypt from 'bcryptjs';

export const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email and password are required'));
  }

  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials'));
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials'));
  }

  const token = generateToken({ id: admin._id, role: admin.role });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Login successful',
    token,
    admin: {
      id: admin._id,
      full_name: admin.full_name,
      email: admin.email,
      phone_number: admin.phone_number,
      role: admin.role,
    },
  });
});
