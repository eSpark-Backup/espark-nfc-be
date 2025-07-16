import { Admin } from '../models/admin.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { CustomError } from '../utils/customError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { attachPresignedImageUrl, replaceImage, removeImage } from '../utils/imageHelper.js';
import { checkDuplicateAdmin } from '../utils/duplicateChecker.js';
import { applyQueryOptions } from '../utils/queryHelper.js';
import crypto from 'crypto';
import { sendVerificationEmail, sendAdminRestorationEmail, sendAdminDeletionEmail } from '../utils/emailHelper.js';

// Create Admin
export const createAdmin = asyncWrapper(async (req, res, next) => {
  const { full_name, email, phone_number, password } = req.body;

  const existing = await checkDuplicateAdmin({ email, phone_number, Admin });
  if (existing) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'An admin with this email or phone number already exists'
      )
    );
  }

  const admin = new Admin({
    full_name,
    email,
    phone_number,
    password,
    role: 'admin',
    created_by: req.admin?.id || null,
  });

  if (req.file) {
    await replaceImage(admin, req.file.buffer, 'admin');
  }

  await admin.save();

  const code = crypto.randomInt(100000, 999999).toString();
  admin.email_verification_code = code;
  admin.email_verification_expires = new Date(Date.now() + 10 * 60 * 1000);
  await admin.save();

  await sendVerificationEmail({
    to: admin.email,
    name: admin.full_name,
    code,
  });

  const savedAdmin = await Admin.findById(admin._id).select('-password');
  await attachPresignedImageUrl(savedAdmin);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message:
      'Admin created successfully. A verification code has been sent to the provided email address. Please enter the code to verify your account',
    admin: savedAdmin,
  });
});

// Get All Admins
export const getAllAdmins = asyncWrapper(async (req, res) => {
  const baseQuery = Admin.find({ role: 'admin', is_deleted: false })
    .select('-password')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  const { results: admins, pagination } = await applyQueryOptions(
    Admin,
    baseQuery,
    req.query,
    ['full_name', 'email', 'phone_number'],
    ['full_name', 'email', 'created_at']
  );

  for (const admin of admins) {
    await attachPresignedImageUrl(admin);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: admins.length ? 'Admins fetched successfully' : 'No admins found',
    admins,
    pagination,
  });
});

// Get Admin by ID
export const getAdminById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const admin = await Admin.findOne({ _id: id, is_deleted: false })
    .select('-password')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  await attachPresignedImageUrl(admin);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin fetched successfully',
    admin,
  });
});

// Update Admin
export const updateAdmin = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { full_name, email, phone_number } = req.body;

  const admin = await Admin.findOne({ _id: id, is_deleted: false });
  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  if ('password' in req.body) {
    return next(
      new CustomError(HTTP_STATUS.BAD_REQUEST, 'Password cannot be updated from this route')
    );
  }

  const emailChanged = email && email !== admin.email;
  const phoneChanged = phone_number && phone_number !== admin.phone_number;

  if (emailChanged || phoneChanged) {
    const duplicate = await checkDuplicateAdmin({
      email: emailChanged ? email : null,
      phone_number: phoneChanged ? phone_number : null,
      excludeId: id,
      Admin,
    });

    if (duplicate) {
      return next(
        new CustomError(
          HTTP_STATUS.BAD_REQUEST,
          'Another admin with this email or phone number already exists'
        )
      );
    }
  }

  let updated = false;
  let imageUpdated = false;

  if (req.file) {
    await replaceImage(admin, req.file.buffer, 'admin');
    imageUpdated = true;
  } else if (
    'profile_image' in req.body &&
    (!req.body.profile_image || req.body.profile_image === 'null')
  ) {
    await removeImage(admin);
    imageUpdated = true;
  }

  if (full_name && full_name !== admin.full_name) {
    admin.full_name = full_name;
    updated = true;
  }

  if (emailChanged) {
    const newCode = crypto.randomInt(100000, 999999).toString();

    admin.email = email;
    admin.email_verified = false;
    admin.email_verification_code = newCode;
    admin.email_verification_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await sendVerificationEmail({
      to: email,
      name: admin.full_name,
      code: newCode,
    });

    updated = true;
  }

  if (phoneChanged) {
    admin.phone_number = phone_number;
    updated = true;
  }

  if (!updated && !imageUpdated) {
    await attachPresignedImageUrl(admin);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Admin updated successfully',
      admin,
    });
  }

  admin.updated_by = req.admin?.id || null;
  await admin.save();
  await attachPresignedImageUrl(admin);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: emailChanged
      ? 'Admin updated successfully. A verification code has been sent to the new email address. Verify it to continue using the system.'
      : 'Admin updated successfully',
    admin,
  });
});

// Delete Admin
export const deleteAdmin = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  if (req.admin.id === id) {
    return next(
      new CustomError(HTTP_STATUS.BAD_REQUEST, 'You cannot delete your own admin account')
    );
  }

  const admin = await Admin.findOne({ _id: id, is_deleted: false });
  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  await removeImage(admin);

  admin.is_deleted = true;
  admin.is_active = false;
  admin.updated_by = req.admin?.id || null;
  await admin.save();

  await sendAdminDeletionEmail({
    to: admin.email,
    name: admin.full_name,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin deleted successfully',
  });
});


// Restore Admin
export const restoreAdmin = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const admin = await Admin.findById(id);
  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  if (!admin.is_deleted) {
    return next(
      new CustomError(HTTP_STATUS.BAD_REQUEST, 'This admin is already active or not deleted')
    );
  }

  admin.is_deleted = false;
  admin.is_active = true;
  admin.updated_by = req.admin?.id || null;
  await admin.save();

  await sendAdminRestorationEmail({
    to: admin.email,
    name: admin.full_name,
  });

  await attachPresignedImageUrl(admin);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin restored successfully',
    admin,
  });
});


// Change Password
export const changePassword = asyncWrapper(async (req, res, next) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Passwords are required'));
  }

  const admin = await Admin.findById(req.admin.id).select('+password');
  if (!admin || admin.is_deleted) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Admin not found or unauthorized'));
  }

  const isMatch = await admin.comparePassword(current_password);
  if (!isMatch) {
    return next(new CustomError(HTTP_STATUS.UNAUTHORIZED, 'Current password is incorrect'));
  }

  admin.password = new_password;
  admin.updated_by = req.admin.id;
  await admin.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password updated successfully',
  });
});

// Reset Password by Super Admin
export const resetPasswordBySuperAdmin = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { new_password } = req.body;

  if (req.admin.id === id) {
    return next(
      new CustomError(HTTP_STATUS.BAD_REQUEST, 'You cannot reset your own password from this route')
    );
  }

  if (!new_password) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'New password is required'));
  }

  const admin = await Admin.findOne({ _id: id, role: 'admin', is_deleted: false });
  if (!admin) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  admin.password = new_password;
  admin.updated_by = req.admin.id;
  await admin.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin password reset successfully',
  });
});

// Send Email Verification Code
export const sendEmailVerificationCode = asyncWrapper(async (req, res, next) => {
  const admin = await Admin.findById(req.admin.id).select(
    '+email_verification_code +email_verification_expires'
  );

  if (!admin || admin.is_deleted) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  const code = crypto.randomInt(100000, 999999).toString();

  admin.email_verification_code = code;
  admin.email_verification_expires = new Date(Date.now() + 10 * 60 * 1000);
  await admin.save();

  await sendVerificationEmail({
    to: admin.email,
    name: admin.full_name,
    code,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Verification code has been sent to your email, please check your inbox.',
  });
});

// Verify Email Code
export const verifyEmailCode = asyncWrapper(async (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Verification code is required'));
  }

  const admin = await Admin.findById(req.admin.id).select(
    '+email_verification_code +email_verification_expires'
  );

  if (!admin || admin.is_deleted) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  if (
    !admin.email_verification_code ||
    !admin.email_verification_expires ||
    admin.email_verification_expires < new Date()
  ) {
    return next(
      new CustomError(HTTP_STATUS.BAD_REQUEST, 'Verification code is expired or not sent')
    );
  }

  if (admin.email_verification_code !== code) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Invalid verification code'));
  }

  admin.email_verified = true;
  admin.verified_email_at = new Date();
  admin.email_verification_code = null;
  admin.email_verification_expires = null;
  await admin.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Email verified successfully',
  });
});

export const getDeletedAdmins = asyncWrapper(async (req, res) => {
  const baseQuery = Admin.find({ role: 'admin', is_deleted: true })
    .select('-password')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  const { results: admins, pagination } = await applyQueryOptions(
    Admin,
    baseQuery,
    req.query,
    ['full_name', 'email', 'phone_number'],
    ['full_name', 'email', 'created_at']
  );

  for (const admin of admins) {
    await attachPresignedImageUrl(admin);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: admins.length ? 'Deleted admins fetched successfully' : 'No deleted admins found',
    admins,
    pagination,
  });
});

