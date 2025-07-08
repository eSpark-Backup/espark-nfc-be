import Admin from '../models/admin.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';
import applyQueryOptions from '../utils/queryHelper.js';
import { generatePresignedUrl } from '../utils/s3.js';

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
    const uploaded = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);
    profile_image = {
      public_id: uploaded?.key || null,
      url: uploaded?.url || null,
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

  if (admin.profile_image?.public_id) {
    admin.profile_image.url = await generatePresignedUrl(admin.profile_image.public_id);
  }

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

  for (const admin of admins) {
    if (admin.profile_image?.public_id) {
      admin.profile_image.url = await generatePresignedUrl(admin.profile_image.public_id);
    }
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

  if (admin.profile_image?.public_id) {
    admin.profile_image.url = await generatePresignedUrl(admin.profile_image.public_id);
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

  if ('password' in req.body) {
    return next(
      new CustomError(HTTP_STATUS.BAD_REQUEST, 'Password cannot be updated from this route')
    );
  }

  const trimmedName = full_name?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone_number?.trim();

  const emailChanged = normalizedEmail && normalizedEmail !== admin.email;
  const phoneChanged = normalizedPhone && normalizedPhone !== admin.phone_number;

  if (emailChanged || phoneChanged) {
    const duplicate = await Admin.findOne({
      $or: [
        ...(emailChanged ? [{ email: normalizedEmail }] : []),
        ...(phoneChanged ? [{ phone_number: normalizedPhone }] : []),
      ],
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

  let imageUpdated = false;
  if (req.file) {
    if (admin.profile_image?.public_id) {
      await deleteFromS3(admin.profile_image.public_id);
    }

    const uploaded = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype);

    admin.profile_image = {
      public_id: uploaded?.key || admin.profile_image?.public_id,
      url: uploaded?.url || admin.profile_image?.url || null,
    };
    imageUpdated = true;
  }

  let updated = false;

  if (trimmedName && trimmedName !== admin.full_name) {
    admin.full_name = trimmedName;
    updated = true;
  }

  if (emailChanged) {
    admin.email = normalizedEmail;
    updated = true;
  }

  if (phoneChanged) {
    admin.phone_number = normalizedPhone;
    updated = true;
  }

  if (!updated && !imageUpdated) {
    if (admin.profile_image?.public_id) {
      admin.profile_image.url = await generatePresignedUrl(admin.profile_image.public_id);
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Admin updated successfully',
      admin,
    });
  }

  await admin.save();

  if (admin.profile_image?.public_id) {
    admin.profile_image.url = await generatePresignedUrl(admin.profile_image.public_id);
  }

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

