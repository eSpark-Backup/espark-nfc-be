import Department from '../models/department.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { deleteFromCloudinary } from '../utils/cloudinary.js';
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
    $or: [
      { email: normalizedEmail },
      { name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } },
    ],
  });

  if (existingDepartment) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'A department with the same name or email already exists'
      )
    );
  }

  const department = await Department.create({
    name,
    email,
    profile_image: {
      public_id: profileImage.public_id,
      url: profileImage.secure_url,
    },
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
        limit: 5, // limit to 5 recent employees (adjustable)
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
  const isSameImage = department.profile_image?.public_id === profileImage.public_id;

  if (isSameName && isSameEmail && isSameImage) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Department updated successfully',
      department,
    });
  }

  // Only check for duplicate if name or email is changing
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

  // Update image
  await deleteFromCloudinary(department.profile_image.public_id);
  department.profile_image = {
    public_id: profileImage.public_id,
    url: profileImage.secure_url,
  };

  // Update only if provided
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

  // Check if any employees are linked to this department
  const employeeCount = await Employee.countDocuments({ department_id: id });
  if (employeeCount > 0) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'Cannot delete department with assigned employees'
      )
    );
  }

  await deleteFromCloudinary(department.profile_image.public_id);
  await department.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Department deleted successfully',
  });
});

