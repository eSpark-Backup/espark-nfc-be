import { Employee } from '../models/employee.model.js';
import { Department } from '../models/department.model.js';
import { CompanyProfile } from '../models/companyProfile.model.js';
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

  const companyProfile = await CompanyProfile.findOne();

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
    updated_by: null,
    company_id: companyProfile?._id
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
  let baseQuery = Employee.find()
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email')
    .populate('department_id', 'name')
    .populate('company_id', 'company_name');

  const { results: employees, pagination } = await applyQueryOptions(
    Employee,
    baseQuery,
    req.query,
    ['name', 'email', 'phone_number', 'designation'],
    ['name', 'email', 'created_at']
  );

  const employeesWithExtras = await Promise.all(
    employees.map(async (emp) => {
      await attachPresignedImageUrl(emp, 'profile_image');
      return emp;
    })
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: employeesWithExtras.length ? 'Employees fetched successfully' : 'No employees found',
    employees: employeesWithExtras,
    pagination,
  });
});


// Get Employee By ID
export const getEmployeeById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const employee = await Employee.findById(id)
    .populate('department_id', 'name email')
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email')
    .populate('company_id', 'company_name');

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  await attachPresignedImageUrl(employee, 'profile_image');

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

  const normalizedEmail = email || employee.email;
  const normalizedPhone = phone_number || employee.phone_number;

  const isSameEmail = employee.email === normalizedEmail;
  const isSamePhone = employee.phone_number === normalizedPhone;

  if (!isSameEmail || !isSamePhone) {
    const duplicate = await checkDuplicateEmployee({
      email: normalizedEmail,
      phone_number: normalizedPhone,
      excludeId: id,
      Employee,
    });

    if (duplicate) {
      return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email or phone number already exists'));
    }
  }

  let updated = false;

  if (email && email !== employee.email) {
    employee.email = email;
    updated = true;
  }

  if (phone_number && phone_number !== employee.phone_number) {
    employee.phone_number = phone_number;
    updated = true;
  }

  if (department_id && department_id !== employee.department_id?.toString()) {
    const department = await Department.findById(department_id);
    if (!department) {
      return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
    }
    employee.department_id = department_id;
    updated = true;
  }

  // Update social links
  const socialLinksChanged = ['facebook', 'twitter', 'instagram', 'youtube'].some(
    (key) => (employee.social_links?.[key] || '') !== req.body[key]
  );

  if (socialLinksChanged) {
    employee.social_links = { facebook, twitter, instagram, youtube };
    updated = true;
  }

  // Update other fields
  Object.entries(fieldsToUpdate).forEach(([key, value]) => {
    if (value !== undefined && value !== employee[key]) {
      employee[key] = value;
      updated = true;
    }
  });

  if (req.file) {
    await replaceImage(employee, req.file.buffer, 'employee', 'profile_image');
    updated = true;
  } else if (
    'profile_image' in req.body &&
    (!req.body.profile_image || req.body.profile_image === 'null')
  ) {
    await removeImage(employee, 'profile_image');
    employee.profile_image = undefined;
    updated = true;
  }

  // Require image to exist after update
  if (!employee.profile_image?.image_key && !req.file) {
    return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Profile image is required'));
  }

  if (!updated) {
    await attachPresignedImageUrl(employee, 'profile_image');
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Employee updated successfully',
      employee,
    });
  }

  employee.updated_by = req.admin?.id || null;
  await employee.save();

  await attachPresignedImageUrl(employee, 'profile_image');

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

  await removeImage(employee, 'profile_image');
  await employee.deleteOne();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee deleted successfully',
  });
});
