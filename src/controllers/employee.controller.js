import Employee from '../models/employee.model.js';
import Department from '../models/department.model.js';
import asyncWrapper from '../utils/asyncWrapper.js';
import CustomError from '../utils/customError.js';
import { uploadToS3, deleteFromS3 } from '../services/s3Uploader.js';
import applyQueryOptions from '../utils/queryHelper.js';
import HTTP_STATUS from '../constants/httpStatus.js';

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

  const normalizedEmail = email.toLowerCase();

  const existingEmail = await Employee.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email already exists'));
  }

  const department = await Department.findById(department_id);
  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  const fileKey = `${Date.now()}-${req.file.originalname}`;
  const uploadResult = await uploadToS3(req.file.buffer, fileKey, req.file.mimetype);

  const employee = await Employee.create({
    name,
    email: normalizedEmail,
    phone_number,
    age,
    joining_date,
    designation,
    department_id,
    about_me,
    address,
    social_links: {
      facebook: facebook || '',
      twitter: twitter || '',
      instagram: instagram || '',
      youtube: youtube || '',
    },
    image_url: uploadResult.url,
    image_key: fileKey,
  });

  res.status(HTTP_STATUS.CREATED).json({ success: true, employee });
});

// Get all employees (with pagination/search/sort)
export const getEmployees = asyncWrapper(async (req, res) => {
  const baseQuery = Employee.find();

  const { results: employees, pagination } = await applyQueryOptions(
    Employee,
    baseQuery,
    req.query,
    ['name', 'email', 'phone_number', 'designation'],
    ['name', 'email', 'created_at']
  );

  if (employees.length === 0) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'No employees found',
      employees: [],
      pagination,
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    employees,
    pagination,
  });
});

// Get single employee by ID
export const getEmployeeById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const employee = await Employee.findById(id).populate('department_id', 'name email');

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    employee,
  });
});

// Update employee
export const updateEmployee = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { email, department_id, facebook, twitter, instagram, youtube, ...otherFields } = req.body;

  const employee = await Employee.findById(id);
  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  // ✅ Normalize and trim input
  const trimmedEmail = email?.trim().toLowerCase();
  const trimmedDeptId = department_id?.trim() || employee.department_id.toString();

  const normalizedSocial = {
    facebook: facebook?.trim() || '',
    twitter: twitter?.trim() || '',
    instagram: instagram?.trim() || '',
    youtube: youtube?.trim() || '',
  };

  // ✅ Compare current state
  const isSameEmail = trimmedEmail === employee.email;
  const isSameDept = trimmedDeptId === employee.department_id.toString();
  const isSameImage = !req.file;

  const socialUnchanged =
    (employee.social_links.facebook || '') === normalizedSocial.facebook &&
    (employee.social_links.twitter || '') === normalizedSocial.twitter &&
    (employee.social_links.instagram || '') === normalizedSocial.instagram &&
    (employee.social_links.youtube || '') === normalizedSocial.youtube;

  const otherFieldsUnchanged = Object.entries(otherFields).every(([key, value]) => {
    return employee[key]?.toString() === value?.toString();
  });

  // ✅ Early return if nothing has changed
  if (isSameEmail && isSameDept && isSameImage && socialUnchanged && otherFieldsUnchanged) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Nothing to update',
      employee,
    });
  }

  // ✅ Check for email duplication
  if (trimmedEmail && trimmedEmail !== employee.email) {
    const duplicate = await Employee.findOne({ email: trimmedEmail, _id: { $ne: id } });
    if (duplicate) {
      return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email already exists'));
    }
    employee.email = trimmedEmail;
  }

  // ✅ Validate and update department
  if (department_id && department_id !== employee.department_id.toString()) {
    const department = await Department.findById(department_id);
    if (!department) {
      return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
    }
    employee.department_id = department_id;
  }

  // ✅ Update other fields
  Object.entries(otherFields).forEach(([key, value]) => {
    if (value !== undefined) {
      employee[key] = value;
    }
  });

  // ✅ Update social links
  employee.social_links.facebook = normalizedSocial.facebook;
  employee.social_links.twitter = normalizedSocial.twitter;
  employee.social_links.instagram = normalizedSocial.instagram;
  employee.social_links.youtube = normalizedSocial.youtube;

  // ✅ Handle image update
  if (req.file) {
    if (employee.image_key) {
      await deleteFromS3(employee.image_key);
    }

    const fileKey = `employee_profiles/${Date.now()}-${req.file.originalname}`;
    const uploadResult = await uploadToS3(req.file.buffer, fileKey, req.file.mimetype);

    employee.image_url = uploadResult?.url || employee.image_url;
    employee.image_key = fileKey;
  }

  await employee.save();

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

  if (employee.image_key) {
    await deleteFromS3(employee.image_key);
  }

  await employee.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee deleted successfully',
  });
});
