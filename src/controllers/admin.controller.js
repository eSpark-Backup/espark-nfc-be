import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';
import applyQueryOptions from '../utils/queryHelper.js';

// Create Admin
export const createAdmin = asyncWrapper(async (req, res, next) => {
  const { full_name, email, phone_number, password } = req.body;

  const existing = await Admin.findOne({
    $or: [{ email }, { phone_number }],
  });

  if (existing) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'An admin with this email or phone number already exists'
      )
    );
  }

  let profile_image = { public_id: null, url: null };

  if (req.file) {
    const uploaded = await uploadToS3(req.file, 'admin_profiles');
    profile_image = {
      public_id: uploaded?.Key || null,
      url: uploaded?.Location || null,
    };
  }

  const admin = await Admin.create({
    full_name,
    email,
    phone_number,
    password,
    role: 'admin',
    profile_image,
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Admin created successfully',
    admin,
  });
});

// Get All Admins
export const getAllAdmins = asyncWrapper(async (req, res) => {
  const baseQuery = Admin.find({ role: 'admin' }).select('-password');

  const { results: admins, pagination } = await applyQueryOptions(
    Admin,
    baseQuery,
    req.query,
    ['full_name', 'email', 'phone_number'],
    ['full_name', 'email', 'created_at']
  );

  if (admins.length === 0) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'No admins found',
      admins: [],
      pagination,
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admins fetched successfully',
    admins,
    pagination,
  });
});

// Get Admin by ID
export const getAdminById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const admin = await Admin.findById(id).select('-password');

  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

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

  const admin = await Admin.findById(id);
  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  const duplicate = await Admin.findOne({
    $or: [{ email }, { phone_number }],
    _id: { $ne: id },
  });

  if (duplicate) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'Another admin with this email or phone number already exists'
      )
    );
  }

  // Handle profile image replacement
  if (req.file) {
    if (admin.profile_image?.public_id) {
      await deleteFromS3(admin.profile_image.public_id);
    }
    const uploaded = await uploadToS3(req.file, 'admin_profiles');
    admin.profile_image = {
      public_id: uploaded?.Key || null,
      url: uploaded?.Location || null,
    };
  }

  if (full_name) admin.full_name = full_name;
  if (email) admin.email = email;
  if (phone_number) admin.phone_number = phone_number;

  await admin.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin updated successfully',
    admin,
  });
});

// Delete Admin
export const deleteAdmin = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return next(
      new CustomError(HTTP_STATUS.BAD_REQUEST, 'You cannot delete your own admin account')
    );
  }

  const admin = await Admin.findById(id);
  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  if (admin.profile_image?.public_id) {
    await deleteFromS3(admin.profile_image.public_id);
  }

  await admin.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin deleted successfully',
  });
});
