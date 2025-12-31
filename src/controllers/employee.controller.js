import mongoose from 'mongoose';
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
  uploadImage,
} from '../utils/imageHelper.js';
import { checkDuplicateEmployee } from '../utils/duplicateChecker.js';
import { generateVCard } from '../utils/vCardGenerator.js';
import { generateQRCodePNG } from '../utils/QRCodeGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

// Create Employee
export const createEmployee = asyncWrapper(async (req, res, next) => {
  const companyProfile = await CompanyProfile.findOne();

  const {
    name,
    email,
    phone_number,
    second_phone_number,
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
    linkedin,
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
    second_phone_number,
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
      linkedin,
    },
    created_by: req.admin?.id || null,
    updated_by: null,
    company_id: companyProfile?._id,
  };

  if (req.file) {
    const { image_key, image_url } = await uploadImage(req.file.buffer, 'employee');
    employeeData.profile_image = { image_key, image_url };
  }

  const employee = await Employee.create(employeeData);

  // await employee.populate('department_id', 'name email image banner_image');
  await employee.populate({
    path: 'department_id',
    select: 'name email image banner_image',
  });

  if (employee.department_id?.image?.image_key) {
    await attachPresignedImageUrl(employee.department_id, 'image');
  }
  if (employee.department_id?.banner_image?.image_key) {
    await attachPresignedImageUrl(employee.department_id, 'banner_image');
  }

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
    .populate('department_id', 'name email image banner_image')
    .populate('company_id', 'company_name');

  const { results: employees, pagination } = await applyQueryOptions(
    Employee,
    baseQuery,
    req.query,
    ['name', 'email', 'phone_number', 'second_phone_number', 'designation'],
    ['name', 'email', 'created_at']
  );

  const employeesWithExtras = await Promise.all(
    employees.map(async (emp) => {
      await attachPresignedImageUrl(emp, 'profile_image');

      if (emp.department_id?.image?.image_key) {
        await attachPresignedImageUrl(emp.department_id, 'image');
      }
      if (emp.department_id?.banner_image?.image_key) {
        await attachPresignedImageUrl(emp.department_id, 'banner_image');
      }

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

// Get Employee Count
export const getEmployeeCount = asyncWrapper(async (req, res) => {
  const totalEmployees = await Employee.countDocuments();
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Total number of employees fetched successfully',
    total_employees: totalEmployees,
  });
});

// Get Employee By ID
export const getEmployeeById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  await Employee.findOneAndUpdate(query, { $inc: { view_count: 1 } });

  const employee = await Employee.findOne(query)
    .populate({
      path: 'department_id',
      select: 'name email image banner_image',
    })
    .populate('created_by', 'full_name email')
    .populate('updated_by', 'full_name email');

  if (employee.department_id?.image?.image_key) {
    await attachPresignedImageUrl(employee.department_id, 'image');
  }
  if (employee.department_id?.banner_image?.image_key) {
    await attachPresignedImageUrl(employee.department_id, 'banner_image');
  }

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  // Add QR code URL here
  const baseUrl = process.env.BASE_URL; // e.g., https://yourdomain.com
  employee.qr_url = `${baseUrl}/api/employees/${employee._id}/public/contact-qr`;

  await attachPresignedImageUrl(employee, 'profile_image');

  const company = await CompanyProfile.findOne();
  if (company?.profile_image?.image_key) {
    await attachPresignedImageUrl(company, 'profile_image');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee fetched successfully',
    employee,
    company,
  });
});

// Update Employee
export const updateEmployee = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const {
    email,
    phone_number,
    second_phone_number,
    department_id,
    facebook,
    twitter,
    instagram,
    youtube,
    linkedin,
    profile_image,
    ...fieldsToUpdate
  } = req.body;

  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  const employee = await Employee.findOne(query);

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  const normalizedEmail = email || employee.email;
  const normalizedPhone = phone_number || employee.phone_number;

  const isSameEmail = employee.email === normalizedEmail;
  const isSamePhone = employee.phone_number === normalizedPhone;

  // Check for duplicate email or phone if changed
  if (!isSameEmail || !isSamePhone) {
    const duplicate = await checkDuplicateEmployee({
      email: normalizedEmail,
      phone_number: normalizedPhone,
      excludeId: employee._id,
      Employee,
    });

    if (duplicate) {
      return next(new CustomError(HTTP_STATUS.BAD_REQUEST, 'Email or phone number already exists'));
    }
  }

  let updated = false;

  // Update email
  if (email && email !== employee.email) {
    employee.email = email;
    updated = true;
  }

  // Update phone number
  if (phone_number && phone_number !== employee.phone_number) {
    employee.phone_number = phone_number;
    updated = true;
  }

  if (second_phone_number !== undefined && second_phone_number !== employee.second_phone_number) {
    employee.second_phone_number = second_phone_number || '';
    updated = true;
  }

  // Update department if changed
  if (department_id && department_id !== employee.department_id?.toString()) {
    const department = await Department.findById(department_id);
    if (!department) {
      return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Department not found'));
    }
    employee.department_id = department_id;
    updated = true;
  }

  // Update social links if any changed
  const socialLinksChanged = ['facebook', 'twitter', 'instagram', 'youtube', 'linkedin'].some(
    (key) => (employee.social_links?.[key] || '') !== req.body[key]
  );

  if (socialLinksChanged) {
    employee.social_links = { facebook, twitter, instagram, youtube, linkedin };
    updated = true;
  }

  // Update other fields
  Object.entries(fieldsToUpdate).forEach(([key, value]) => {
    if (value !== undefined && value !== employee[key]) {
      employee[key] = value;
      updated = true;
    }
  });

  // Handle image updates
  if (req.file) {
    // Replace existing image with a new one
    await replaceImage(employee, req.file.buffer, 'employee', 'profile_image');
    updated = true;
  } else if (profile_image === null || profile_image === 'null') {
    // Remove image if explicitly set to null
    await removeImage(employee, 'profile_image');
    employee.profile_image = null;
    updated = true;
  }

  // Save if updated
  if (updated) {
    employee.updated_by = req.admin?.id || null;
    await employee.save();
  }

  await employee.populate({
    path: 'department_id',
    select: 'name email image banner_image',
  });
  if (employee.department_id?.image?.image_key) {
    await attachPresignedImageUrl(employee.department_id, 'image');
  }
  if (employee.department_id?.banner_image?.image_key) {
    await attachPresignedImageUrl(employee.department_id, 'banner_image');
  }

  // Always attach signed URL for image (whether changed or not)
  if (employee.profile_image?.image_key) {
    await attachPresignedImageUrl(employee, 'profile_image');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee updated successfully',
    employee,
  });
});

// Delete Employee
export const deleteEmployee = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  const employee = await Employee.findOne(query);

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

// GET /api/employees/reports
export const getEmployeeReports = asyncWrapper(async (req, res, next) => {
  let query = Employee.find({}, 'name designation profile_image view_count');

  const { results: employees, pagination } = await applyQueryOptions(
    Employee,
    query,
    req.query,
    ['name', 'designation'],
    ['view_count', 'name', 'designation', 'created_at']
  );

  // Attach pre-signed URLs in parallel for performance
  await Promise.all(employees.map((emp) => attachPresignedImageUrl(emp, 'profile_image')));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Employee reports fetched successfully',
    data: employees,
    pagination,
  });
});

export const getEmployeeVCard = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  // Find employee by _id or employee_id
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  const employee = await Employee.findOne(query).lean();

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  // Fetch and convert profile image to base64
  if (employee?.profile_image?.image_key) {
    try {
      const { GetObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: employee.profile_image.image_key,
      });

      const response = await s3Client.send(command);
      const imageBuffer = await streamToBuffer(response.Body);
      employee.profile_image.base64 = imageBuffer.toString('base64');

      // Determine image type from key
      const ext = employee.profile_image.image_key.split('.').pop().toLowerCase();
      employee.profile_image.mimeType = ext === 'png' ? 'PNG' : 'JPEG';
    } catch (error) {
      console.error('Error fetching image from S3:', error);
      // Continue without image if fetch fails
    }
  }

  // Generate vCard content
  const vCardContent = generateVCard(employee);

  // Send vCard as attachment
  res.setHeader('Content-Type', 'text/vcard');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${employee.name.replace(/\s+/g, '_')}.vcf"`
  );
  res.status(HTTP_STATUS.OK).send(vCardContent);
});

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * GET /api/employees/:id/contact-qr
 * Returns PNG QR code pointing to the vCard URL
 */
export const getEmployeeQRCode = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  // Check employee exists
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  const employee = await Employee.findOne(query);

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  // Construct URL for vCard endpoint (adjust your base URL accordingly)
  const vCardUrl = `${process.env.BASE_URL}/api/employees/${employee._id}/contact`;

  // Generate PNG QR code
  const qrBuffer = await generateQRCodePNG(vCardUrl);

  // Send as PNG image
  res.setHeader('Content-Type', 'image/png');
  res.status(HTTP_STATUS.OK).send(qrBuffer);
});

/**
 * @desc    Get wallet pass statistics
 * @route   GET /api/employees/wallet/statistics
 * @access  Private (Admin/Super Admin)
 */
export const getWalletPassStatistics = asyncWrapper(async (req, res) => {
  const statistics = await Employee.getWalletPassStatistics();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Wallet pass statistics retrieved successfully',
    data: statistics,
  });
});
