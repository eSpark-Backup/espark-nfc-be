import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import {
  attachPresignedImageUrl,
  replaceImage,
  removeImage,
} from '../utils/imageHelper.js';
import { checkDuplicateAdmin } from '../utils/duplicateChecker.js';

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
  const savedAdmin = await Admin.findById(admin._id).select('-password');

  await attachPresignedImageUrl(savedAdmin);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Admin created successfully',
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
    admin.email = email;
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
    message: 'Admin updated successfully',
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

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin deleted successfully',
  });
});
