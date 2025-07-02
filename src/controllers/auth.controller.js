import Admin from '../models/admin.model.js';
import { generateToken } from '../utils/token.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import httpStatusCodes from '../constants/httpStatus.js';

export const loginAdmin = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new CustomError(httpStatusCodes.BAD_REQUEST, 'Email and password are required'));
  }

  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin || !(await admin.comparePassword(password))) {
    return next(new CustomError(httpStatusCodes.UNAUTHORIZED, 'Invalid credentials'));
  }

  const token = generateToken({ id: admin._id });

  res.status(httpStatusCodes.OK).json({
    success: true,
    message: 'Login successful',
    token,
    admin,
  });
});
