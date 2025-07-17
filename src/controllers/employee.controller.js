import { Employee } from '../models/employee.model.js';
import { Department } from '../models/department.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { CustomError } from '../utils/customError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { applyQueryOptions } from '../utils/queryHelper.js';
import {
  replaceImage,
  removeImage,
  attachPresignedImageUrl,
  uploadImage
} from '../utils/imageHelper.js';
import { checkDuplicateEmployee } from '../utils/duplicateChecker.js';

// Create Employee
export const createEmployee = asyncWrapper(async (req, res, next) => {
  const {
    name,
    email,
    phone_number,
    age,
    joining_date,
    designation,
    address,
    about_me,
    department_id,
    facebook,
    twitter,
    instagram,
    youtube,
  } = req.body;

  const duplicate = await checkDuplicateEmployee({ email, phone_number, Employee });
  if (duplicate) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email or phone number already exists'));
  }

  const department = await Department.findById(department_id);
  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  const employeeData = {
    name,
    email,
    phone_number,
    age,
    joining_date,
    designation,
    address,
    about_me,
    department_id,
    social_links: {
      facebook,
      twitter,
      instagram,
      youtube,
    },
    created_by: req.admin?.id || null,
    updated_by: null
  };

  if (req.file) {
    const { image_key, image_url } = await uploadImage(req.file.buffer, 'employee');
    employeeData.profile_image = { image_key, image_url };
  }

  const employee = await Employee.create(employeeData);

  if (employee?.profile_image?.image_key) {
    await attachPresignedImageUrl(employee, 'profile_image');
  }

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Employee created successfully',
    employee,
  });
});





// Get All Employees
export const getEmployees = asyncWrapper(async (req, res) => {
  const baseQuery = Employee.find()
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  const { results: employees, pagination } = await applyQueryOptions(
    Employee,
    baseQuery,
    req.query,
    ['name', 'email', 'phone_number', 'designation'],
    ['name', 'email', 'created_at']
  );

  await Promise.all(employees.map(attachPresignedImageUrl));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: employees.length ? 'Employees fetched successfully' : 'No employees found',
    employees,
    pagination,
  });
});

// Get Employee By ID
export const getEmployeeById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const employee = await Employee.findById(id)
    .populate('department_id', 'name email')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  await attachPresignedImageUrl(employee);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee fetched successfully',
    employee,
  });
});

// Update Employee
export const updateEmployee = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const {
    email,
    phone_number,
    department_id,
    facebook,
    twitter,
    instagram,
    youtube,
    ...fieldsToUpdate
  } = req.body;

  const employee = await Employee.findById(id);
  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  let updated = false;

  if (
    (email && email !== employee.email) ||
    (phone_number && phone_number !== employee.phone_number)
  ) {
    const duplicate = await checkDuplicateEmployee({
      email: email !== employee.email ? email : null,
      phone_number: phone_number !== employee.phone_number ? phone_number : null,
      excludeId: id,
      Employee,
    });

    if (duplicate) {
      return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email or phone number already exists'));
    }

    if (email) {
      employee.email = email;
      updated = true;
    }

    if (phone_number) {
      employee.phone_number = phone_number;
      updated = true;
    }
  }

  if (department_id && department_id !== employee.department_id.toString()) {
    const department = await Department.findById(department_id);
    if (!department) {
      return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
    }
    employee.department_id = department_id;
    updated = true;
  }

  Object.entries(fieldsToUpdate).forEach(([key, value]) => {
    if (value !== undefined && value !== employee[key]) {
      employee[key] = value;
      updated = true;
    }
  });

  const socialLinksChanged = ['facebook', 'twitter', 'instagram', 'youtube'].some(
    (key) => (employee.social_links[key] || '') !== req.body[key]
  );

  if (socialLinksChanged) {
    employee.social_links = { facebook, twitter, instagram, youtube };
    updated = true;
  }

  if (req.file) {
    await replaceImage(employee, req.file.buffer, 'employee');
    updated = true;
  } else if (
    'profile_image' in req.body &&
    (!req.body.profile_image || req.body.profile_image === 'null')
  ) {
    await removeImage(employee);
    updated = true;
  }

  if (!updated) {
    await attachPresignedImageUrl(employee);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Nothing to update',
      employee,
    });
  }

  employee.updated_by = req.admin?.id || null;
  await employee.save();

  await attachPresignedImageUrl(employee);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee updated successfully',
    employee,
  });
});

// Delete Employee
export const deleteEmployee = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const employee = await Employee.findById(id);
  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  await removeImage(employee);
  await employee.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee deleted successfully',
  });
});
