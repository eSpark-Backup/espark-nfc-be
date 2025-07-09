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

  const normalizedEmail = email.toLowerCase();

  const existingEmail = await Employee.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email already exists'));
  }

  const department = await Department.findById(department_id);
  if (!department) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
  }

  const newEmployee = new Employee({
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

  res.status(HTTP_STATUS.CREATED).json({ success: true, employee: newEmployee });
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

  for (const emp of employees) {
    if (emp.profile_image?.image_key) {
      emp.profile_image.image_url = await generatePresignedUrl(emp.profile_image.image_key);
    }
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
  const { email, department_id, facebook, twitter, instagram, youtube, ...otherFields } = req.body;

  const employee = await Employee.findById(id);
  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  const trimmedEmail = email?.trim().toLowerCase();
  const trimmedDeptId = department_id?.trim() || employee.department_id.toString();

  const normalizedSocial = {
    facebook: facebook?.trim() || '',
    twitter: twitter?.trim() || '',
    instagram: instagram?.trim() || '',
    youtube: youtube?.trim() || '',
  };

  const isSameEmail = trimmedEmail === employee.email;
  const isSameDept = trimmedDeptId === employee.department_id.toString();
  const isSameImage = !req.file && !('profile_image' in req.body);
  const socialUnchanged =
    (employee.social_links.facebook || '') === normalizedSocial.facebook &&
    (employee.social_links.twitter || '') === normalizedSocial.twitter &&
    (employee.social_links.instagram || '') === normalizedSocial.instagram &&
    (employee.social_links.youtube || '') === normalizedSocial.youtube;

  const otherFieldsUnchanged = Object.entries(otherFields).every(([key, value]) => {
    return employee[key]?.toString() === value?.toString();
  });

  if (isSameEmail && isSameDept && isSameImage && socialUnchanged && otherFieldsUnchanged) {
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

  if (trimmedEmail && trimmedEmail !== employee.email) {
    const duplicate = await Employee.findOne({ email: trimmedEmail, _id: { $ne: id } });
    if (duplicate) {
      return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email already exists'));
    }
    employee.email = trimmedEmail;
  }

  if (department_id && department_id !== employee.department_id.toString()) {
    const department = await Department.findById(department_id);
    if (!department) {
      return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
    }
    employee.department_id = department_id;
  }

  Object.entries(otherFields).forEach(([key, value]) => {
    if (value !== undefined) {
      employee[key] = value;
    }
  });

  employee.social_links.facebook = normalizedSocial.facebook;
  employee.social_links.twitter = normalizedSocial.twitter;
  employee.social_links.instagram = normalizedSocial.instagram;
  employee.social_links.youtube = normalizedSocial.youtube;

  // ✅ Image update
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
  }

  // ✅ Image removal
  else if (
    !req.file &&
    'profile_image' in req.body &&
    (!req.body.profile_image || req.body.profile_image === 'null')
  ) {
    if (employee.profile_image?.image_key) {
      await deleteFromS3(employee.profile_image.image_key);
    }

    employee.profile_image = { image_key: null, image_url: null };
  }

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
