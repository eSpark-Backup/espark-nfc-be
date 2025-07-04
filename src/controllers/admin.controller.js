import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';

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

export const getAllAdmins = asyncWrapper(async (req, res) => {
  const admins = await Admin.find({ role: 'admin' }).select('-password');

  res.status(HTTP_STATUS.OK).json({
    success: true,
    admins,
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

  const isSameName = admin.full_name === full_name;
  const isSameEmail = admin.email === email;
  const isSamePhone = admin.phone_number === phone_number;

  if (isSameName && isSameEmail && isSamePhone) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Admin updated successfully',
      admin,
    });
  }

  // Check for duplicate only if email or phone number has changed
  if (!isSameEmail || !isSamePhone) {
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
  }

  admin.full_name = full_name || admin.full_name;
  admin.email = email || admin.email;
  admin.phone_number = phone_number || admin.phone_number;

  await admin.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Admin updated successfully',
    admin,
  });
});



export const deleteAdmin = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

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
