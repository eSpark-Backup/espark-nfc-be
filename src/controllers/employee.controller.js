import Employee from '../models/employee.model.js';
import Department from '../models/department.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';
import applyQueryOptions from '../utils/queryHelper.js';
import HTTP_STATUS from '../constants/httpStatus.js';
import { generatePresignedUrl } from '../utils/s3.js';
import { processImage } from '../utils/imageProcessor.js';

// Create employee
export const createEmployee = asyncWrapper(async (req, res, next) => {
  const {
    name,
    email,
    phone_number,
    age,
    joining_date,
    designation,
    department_id,
    about_me,
    address,
    facebook,
    twitter,
    instagram,
    youtube,
  } = req.body;

  if (!req.file) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  const existing = await Employee.findOne({
    $or: [{ email }, { phone_number }],
  });

  if (existing) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email or phone number already exists'));
  }

  const department = await Department.findById(department_id);
  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  const newEmployee = new Employee({
    name,
    email,
    phone_number,
    age,
    joining_date,
    designation,
    department_id,
    about_me,
    address,
    social_links: {
      facebook,
      twitter,
      instagram,
      youtube,
    },
    created_by: req.user.id,
    updated_by: req.user.id,
  });

  const optimizedBuffer = await processImage(req.file.buffer);
  const filename = `employee-${newEmployee._id}.webp`;

  const uploadResult = await uploadToS3(optimizedBuffer, filename, 'image/webp');

  newEmployee.profile_image = {
    image_key: uploadResult?.key || null,
    image_url: uploadResult?.url || null,
  };

  await newEmployee.save();

  if (newEmployee.profile_image?.image_key) {
    newEmployee.profile_image.image_url = await generatePresignedUrl(
      newEmployee.profile_image.image_key
    );
  }

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    employee: newEmployee,
  });
});

// Get all employees
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

  for (const emp of employees) {
    if (emp.profile_image?.image_key) {
      emp.profile_image.image_url = await generatePresignedUrl(emp.profile_image.image_key);
    }
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: employees.length ? 'Employees fetched successfully' : 'No employees found',
    employees,
    pagination,
  });
});

// Get employee by ID
export const getEmployeeById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const employee = await Employee.findById(id)
    .populate('department_id', 'name email')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  if (employee.profile_image?.image_key) {
    employee.profile_image.image_url = await generatePresignedUrl(employee.profile_image.image_key);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    employee,
  });
});

// Update employee
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
    ...otherFields
  } = req.body;

  const employee = await Employee.findById(id);
  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  let updated = false;

  if (email && email !== employee.email) {
    const existingEmail = await Employee.findOne({ email, _id: { $ne: id } });
    if (existingEmail) {
      return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email already exists'));
    }
    employee.email = email;
    updated = true;
  }

  if (phone_number && phone_number !== employee.phone_number) {
    const existingPhone = await Employee.findOne({ phone_number, _id: { $ne: id } });
    if (existingPhone) {
      return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Phone number already exists'));
    }
    employee.phone_number = phone_number;
    updated = true;
  }

  if (department_id && department_id !== employee.department_id.toString()) {
    const department = await Department.findById(department_id);
    if (!department) {
      return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
    }
    employee.department_id = department_id;
    updated = true;
  }

  Object.entries(otherFields).forEach(([key, value]) => {
    if (value !== undefined && value !== employee[key]) {
      employee[key] = value;
      updated = true;
    }
  });

  const newSocialLinks = { facebook, twitter, instagram, youtube };
  const socialChanged = Object.keys(newSocialLinks).some(
    (key) => (employee.social_links[key] || '') !== newSocialLinks[key]
  );

  if (socialChanged) {
    employee.social_links = newSocialLinks;
    updated = true;
  }

  if (req.file) {
    if (employee.profile_image?.image_key) {
      await deleteFromS3(employee.profile_image.image_key);
    }

    const optimizedBuffer = await processImage(req.file.buffer);
    const filename = `employee-${employee._id}.webp`;

    const uploadResult = await uploadToS3(optimizedBuffer, filename, 'image/webp');

    employee.profile_image = {
      image_key: uploadResult?.key || null,
      image_url: uploadResult?.url || null,
    };

    updated = true;
  } else if (
    'profile_image' in req.body &&
    (!req.body.profile_image || req.body.profile_image === 'null')
  ) {
    if (employee.profile_image?.image_key) {
      await deleteFromS3(employee.profile_image.image_key);
    }

    employee.profile_image = { image_key: null, image_url: null };
    updated = true;
  }

  if (!updated) {
    if (employee.profile_image?.image_key) {
      employee.profile_image.image_url = await generatePresignedUrl(
        employee.profile_image.image_key
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Nothing to update',
      employee,
    });
  }

  employee.updated_by = req.user.id;
  await employee.save();

  if (employee.profile_image?.image_key) {
    employee.profile_image.image_url = await generatePresignedUrl(employee.profile_image.image_key);
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee updated successfully',
    employee,
  });
});

// Delete employee
export const deleteEmployee = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const employee = await Employee.findById(id);
  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  if (employee.profile_image?.image_key) {
    await deleteFromS3(employee.profile_image.image_key);
  }

  await employee.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee deleted successfully',
  });
});
