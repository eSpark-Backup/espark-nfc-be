import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { generateToken } from '../utils/token.js';
import bcrypt from 'bcryptjs';
import { generatePresignedUrl } from '../utils/s3.js';

export const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email and password are required'));
  }

  const normalizedEmail = email.trim().toLowerCase();

  const admin = await Admin.findOne({
    email: normalizedEmail,
    is_deleted: false,
    is_active: true,
  }).select('+password');

  if (!admin) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials'));
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials'));
  }

  // Update last_login
  admin.last_login = new Date();
  await admin.save();

  const token = generateToken({ id: admin._id, role: admin.role });

  let image_url = null;
  if (admin.profile_image?.image_key) {
    image_url = await generatePresignedUrl(admin.profile_image.image_key);
  }

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
      image_url,
    },
  });
});
