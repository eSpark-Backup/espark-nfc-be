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

  const { url: imageUrl, key: imageKey } = await uploadToS3(
    profileImage.buffer,
    profileImage.originalname,
    profileImage.mimetype
  );

  const department = await Department.create({
    name,
    email,
    image_url: imageUrl,
    image_key: imageKey,
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

  // Always populate employee_count
  baseQuery = baseQuery.populate('employee_count');

  // Conditionally populate employees
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

  const normalizedName = name ? normalize(name) : department.name;
  const normalizedEmail = email ? email.toLowerCase() : department.email;

  const isSameName = department.name === normalizedName;
  const isSameEmail = department.email === normalizedEmail;
  const isSameImage = false; // we always treat a new file as a change

  if (isSameName && isSameEmail && isSameImage) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Department updated successfully',
      department,
    });
  }

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

  // Delete old image from S3
  if (department.image_key) {
    await deleteFromS3(department.image_key);
  }

  // Upload new image to S3
  const { url: imageUrl, key: imageKey } = await uploadToS3(
    profileImage.buffer,
    profileImage.originalname,
    profileImage.mimetype
  );

  department.image_url = imageUrl;
  department.image_key = imageKey;

  if (name) department.name = name;
  if (email) department.email = email;

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
