import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { generateToken } from '../utils/token.js';
import bcrypt from 'bcryptjs';
import { attachPresignedImageUrl } from '../utils/imageHelper.js';

export const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;
  console.log('Raw email from req.body:', email);

  if (!email || !password) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email and password are required'));
  }

  const normalizedEmail = email.trim().toLowerCase();
console.log('Normalized Email:', normalizedEmail);
  const admin = await Admin.findOne({
    email: normalizedEmail,
    is_deleted: false,
    is_active: true,
  }).select('+password');
  console.log('Admin Result:', admin);

  if (!admin) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials'));
  }

  console.log('Incoming email:', normalizedEmail);
  console.log('Admin found:', admin ? 'Yes' : 'No');
  console.log('Stored hash:', admin?.password);
  console.log('Comparing with:', password);

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials'));
  }

  // Update last login timestamp
  admin.last_login = new Date();
  await admin.save();

  const token = generateToken({ id: admin._id, role: admin.role });

  await attachPresignedImageUrl(admin);

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
      image_url: admin.profile_image?.image_url || null,
    },
  });
});
