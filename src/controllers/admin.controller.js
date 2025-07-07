import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';

export const createAdmin = asyncWrapper(async (req, res, next) => {
  const { full_name, email, phone_number, password } = req.body;

  // Check for existing admin
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

  const admin = await Admin.create({
    full_name,
    email,
    phone_number,
    password,
    role: 'admin',
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Admin created successfully',
    admin,
  });
});

import applyQueryOptions from '../utils/queryHelper.js';

export const getAllAdmins = asyncWrapper(async (req, res) => {
  const baseQuery = Admin.find({ role: 'admin' }).select('-password');

  const { results: admins, pagination } = await applyQueryOptions(
    Admin,
    baseQuery,
    req.query,
    ['full_name', 'email', 'phone_number'], // searchable fields
    ['full_name', 'email', 'created_at']    // sortable fields
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

export const updateAdmin = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { full_name, email, phone_number } = req.body;

  const admin = await Admin.findById(id);
  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  // Check for duplicate email or phone (excluding current record)
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

  // Only update if value is provided
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

export const deleteAdmin = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'You cannot delete your own admin account'
      )
    );
  }

  const admin = await Admin.findById(id);
  if (!admin || admin.role !== 'admin') {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Admin not found'));
  }

  await admin.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin deleted successfully',
  });
});
