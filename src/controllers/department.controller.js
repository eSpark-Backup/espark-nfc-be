import Department from '../models/department.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';
import applyQueryOptions from '../utils/queryHelper.js';
import Employee from '../models/employee.model.js';

const normalize = (str) => str.toLowerCase().replace(/[-\s]/g, '');

export const createDepartment = asyncWrapper(async (req, res, next) => {
  const { name, email } = req.body;
  const profileImage = req.file;

  if (!profileImage) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  const normalizedName = normalize(name);
  const normalizedEmail = email.toLowerCase();

  const existingDepartment = await Department.findOne({
    $or: [{ email: normalizedEmail }, { name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } }],
  });

  if (existingDepartment) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'A department with the same name or email already exists'
      )
    );
  }

  const fileKey = `${Date.now()}-${profileImage.originalname}`;
  console.log('🧪 File Buffer Check:', {
    type: typeof req.file.buffer,
    isBuffer: Buffer.isBuffer(req.file.buffer),
  });
  const uploadResult = await uploadToS3(profileImage.buffer, fileKey, profileImage.mimetype);

  const department = await Department.create({
    name,
    email,
    image_url: uploadResult.url,
    image_key: fileKey,
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Department created successfully',
    department,
  });
});

export const getAllDepartments = asyncWrapper(async (req, res) => {
  const includeEmployees = req.query.include_employees === 'true';

  let baseQuery = Department.find();

  baseQuery = baseQuery.populate('employee_count');

  if (includeEmployees) {
    baseQuery = baseQuery.populate({
      path: 'employees',
      options: {
        sort: { createdAt: -1 },
        limit: 5,
      },
    });
  }

  const { results: departments, pagination } = await applyQueryOptions(
    Department,
    baseQuery,
    req.query,
    ['name', 'email'],
    ['name', 'email', 'createdAt']
  );

  if (departments.length === 0) {
    return res.status(HTTP_STATUS.OK).json({
      success: false,
      message: 'No departments found',
      departments: [],
      pagination,
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    departments,
    pagination,
  });
});

export const getDepartmentById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const includeEmployees = req.query.include_employees === 'true';

  let query = Department.findById(id).populate('employee_count');

  if (includeEmployees) {
    query = query.populate({
      path: 'employees',
      options: {
        sort: { createdAt: -1 },
        limit: 10,
      },
    });
  }

  const department = await query;

  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    department,
  });
});

export const updateDepartment = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name, email } = req.body;
  const profileImage = req.file;

  if (!profileImage) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  const department = await Department.findById(id);
  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  // ✅ Normalize and trim inputs
  const trimmedName = name?.trim();
  const normalizedName = trimmedName ? normalize(trimmedName) : department.name;
  const normalizedEmail = email?.trim().toLowerCase() || department.email;

  // ✅ Check for changes
  const isSameName = department.name === normalizedName;
  const isSameEmail = department.email === normalizedEmail;
  const isSameImage = false; // Always updating image, so treated as changed

  if (isSameName && isSameEmail && !profileImage) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Nothing to update',
      department,
    });
  }

  // ✅ Duplicate check only if name or email changed
  if (!isSameName || !isSameEmail) {
    const duplicate = await Department.findOne({
      $or: [
        { email: normalizedEmail },
        { name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } },
      ],
      _id: { $ne: id },
    });

    if (duplicate) {
      return next(
        new CustomError(
          HTTP_STATUS.BAD_REQUEST,
          'Another department with the same name or email already exists'
        )
      );
    }
  }

  // ✅ Handle image update
  if (department.image_key) {
    await deleteFromS3(department.image_key);
  }

  const fileKey = `department_profiles/${Date.now()}-${profileImage.originalname}`;
  const uploadResult = await uploadToS3(profileImage.buffer, fileKey, profileImage.mimetype);

  department.image_url = uploadResult?.url || department.image_url;
  department.image_key = fileKey;

  // ✅ Apply field updates if changed
  if (trimmedName && trimmedName !== department.name) {
    department.name = trimmedName;
  }

  if (normalizedEmail !== department.email) {
    department.email = normalizedEmail;
  }

  await department.save();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Department updated successfully',
    department,
  });
});


export const deleteDepartment = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const department = await Department.findById(id);

  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  const employeeCount = await Employee.countDocuments({ department_id: id });
  if (employeeCount > 0) {
    return next(
      new CustomError(HTTP_STATUS.BAD_REQUEST, 'Cannot delete department with assigned employees')
    );
  }

  if (department.image_key) {
    await deleteFromS3(department.image_key);
  }

  await department.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Department deleted successfully',
  });
});
