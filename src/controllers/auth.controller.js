import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { generateToken } from '../utils/token.js';
import bcrypt from 'bcryptjs';
import { attachPresignedImageUrl } from '../utils/imageHelper.js';

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
  }).select('+password +email_verified');

  if (!admin) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials'));
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials'));
  }

  await attachPresignedImageUrl(admin);

  if (!admin.email_verified) {
    const token = generateToken({ id: admin._id, role: admin.role });

    await attachPresignedImageUrl(admin);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Please verify your email address to continue.',
      requires_verification: true,
      token,
      admin: {
        id: admin._id,
        full_name: admin.full_name,
        email: admin.email,
        email_verified: admin.email_verified,
        phone_number: admin.phone_number,
        role: admin.role,
        image_url: admin.profile_image?.image_url || null,
      },
    });
  }

  // Update last login timestamp
  admin.last_login = new Date();
  await admin.save();

  const token = generateToken({ id: admin._id, role: admin.role });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Login successful',
    token,
    admin: {
      id: admin._id,
      full_name: admin.full_name,
      email: admin.email,
      email_verified: admin.email_verified,
      phone_number: admin.phone_number,
      role: admin.role,
      image_url: admin.profile_image?.image_url || null,
    },
  });
});

