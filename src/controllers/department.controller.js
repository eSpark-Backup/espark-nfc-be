import Department from '../models/department.model.js';
import Employee from '../models/employee.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import applyQueryOptions from '../utils/queryHelper.js';
import {
  replaceImage,
  removeImage,
  attachPresignedImageUrl,
} from '../utils/imageHelper.js';
import { checkDuplicateDepartment } from '../utils/duplicateChecker.js';

const normalize = (str) => str.toLowerCase().replace(/[-\s]/g, '');

// =================== CREATE ===================
export const createDepartment = asyncWrapper(async (req, res, next) => {
  const { name, email } = req.body;

  const normalizedName = normalize(name);
  const duplicate = await checkDuplicateDepartment({ name: normalizedName, email, Department });

  if (duplicate) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'A department with the same name or email already exists'
      )
    );
  }

  const department = new Department({
    name,
    email,
    created_by: req.admin?.id || null,
  });

  if (req.file) {
    await replaceImage(department, req.file.buffer, 'department');
  }

  await department.save();
  await attachPresignedImageUrl(department);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Department created successfully',
    department,
  });
});

// =================== GET ALL ===================
export const getAllDepartments = asyncWrapper(async (req, res) => {
  const includeEmployees = req.query.include_employees === 'true';

  let baseQuery = Department.find()
    .populate('employee_count')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  if (includeEmployees) {
    baseQuery = baseQuery.populate({
      path: 'employees',
      options: { sort: { createdAt: -1 }, limit: 5 },
    });
  }

  const { results: departments, pagination } = await applyQueryOptions(
    Department,
    baseQuery,
    req.query,
    ['name', 'email'],
    ['name', 'email', 'created_at']
  );

  await Promise.all(departments.map(attachPresignedImageUrl));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: departments.length ? 'Departments fetched successfully' : 'No departments found',
    departments,
    pagination,
  });
});

// =================== GET BY ID ===================
export const getDepartmentById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const includeEmployees = req.query.include_employees === 'true';

  let query = Department.findById(id)
    .populate('employee_count')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  if (includeEmployees) {
    query = query.populate({
      path: 'employees',
      options: { sort: { createdAt: -1 }, limit: 10 },
    });
  }

  const department = await query;

  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  await attachPresignedImageUrl(department);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Department fetched successfully',
    department,
  });
});

// =================== UPDATE ===================
export const updateDepartment = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { name, email } = req.body;

  const department = await Department.findById(id);
  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  const normalizedName = name ? normalize(name) : normalize(department.name);
  const normalizedEmail = email || department.email;

  const isSameName = normalize(department.name) === normalizedName;
  const isSameEmail = department.email === normalizedEmail;

  if (!isSameName || !isSameEmail) {
    const duplicate = await checkDuplicateDepartment({
      name: normalizedName,
      email: normalizedEmail,
      excludeId: id,
      Department,
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

  let updated = false;

  if (name && name !== department.name) {
    department.name = name;
    updated = true;
  }

  if (email && email !== department.email) {
    department.email = email;
    updated = true;
  }

  if (req.file) {
    await replaceImage(department, req.file.buffer, 'department');
    updated = true;
  } else if ('image' in req.body && (!req.body.image || req.body.image === 'null')) {
    await removeImage(department);
    updated = true;
  }

  if (!updated) {
    await attachPresignedImageUrl(department);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Nothing to update',
      department,
    });
  }

  department.updated_by = req.admin?.id || null;
  await department.save();

  await attachPresignedImageUrl(department);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Department updated successfully',
    department,
  });
});

// =================== DELETE ===================
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

  await removeImage(department);
  await department.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Department deleted successfully',
  });
});
