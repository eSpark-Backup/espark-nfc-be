import { Employee } from '../models/employee.model.js';
import { CompanyProfile } from '../models/companyProfile.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { CustomError } from '../utils/customError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { appleWalletGenerator } from '../utils/wallet/appleWalletGenerator.js';
import { attachPresignedImageUrl } from '../utils/imageHelper.js';
import mongoose from 'mongoose';
import fs from 'fs';

/**
 * @desc    Generate Apple Wallet pass for an employee
 * @route   POST /api/employees/:id/wallet/apple/generate
 * @access  Private (Admin/Super Admin)
 */
export const generateAppleWalletPass = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  // Find employee by _id or employee_id
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  const employee = await Employee.findOne(query).populate('department_id', 'name');

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  // Get company profile
  const companyProfile = await CompanyProfile.findOne();

  if (!companyProfile) {
    return next(
      new CustomError(
        HTTP_STATUS.NOT_FOUND,
        'Company profile not found. Please set up company profile first.'
      )
    );
  }

  // Attach presigned URLs for images
  if (employee.profile_image?.image_key) {
    await attachPresignedImageUrl(employee, 'profile_image');
  }

  if (companyProfile.profile_image?.image_key) {
    await attachPresignedImageUrl(companyProfile, 'profile_image');
  }

  // Generate Apple Wallet pass
  const result = await appleWalletGenerator.generatePass(employee, companyProfile);

  // Save pass to file
  const fileResult = await appleWalletGenerator.savePassToFile(result.passBuffer, employee._id);

  const authToken = appleWalletGenerator.getLastAuthToken();

  // Update employee record with pass information
  await employee.updateAppleWalletPass({
    serialNumber: result.serialNumber,
    filePath: fileResult.filePath,
    size: result.passBuffer.length,
    authenticationToken: authToken,
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Apple Wallet pass generated successfully',
    data: {
      employee_id: employee.employee_id,
      employee_name: employee.name,
      serial_number: result.serialNumber,
      file_name: fileResult.fileName,
      file_size: result.passBuffer.length,
      generated_at: new Date(),
    },
  });
});

/**
 * @desc    Download Apple Wallet pass for an employee
 * @route   GET /api/employees/:id/wallet/apple/download
 * @access  Private (Admin/Super Admin)
 */
export const downloadAppleWalletPass = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  const employee = await Employee.findOne(query);

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  // Check if pass exists
  if (!employee.hasAppleWalletPass()) {
    return next(
      new CustomError(
        HTTP_STATUS.NOT_FOUND,
        'Apple Wallet pass not generated yet. Please generate the pass first.'
      )
    );
  }

  const passFilePath = employee.getAppleWalletPassPath();

  // Check if file exists
  if (!passFilePath || !fs.existsSync(passFilePath)) {
    return next(
      new CustomError(HTTP_STATUS.NOT_FOUND, 'Pass file not found. Please regenerate the pass.')
    );
  }

  // Read pass file
  const passBuffer = fs.readFileSync(passFilePath);

  // CRITICAL: Generate safe filename for iPhone
  const safeEmployeeName = employee.name.replace(/[^a-zA-Z0-9]/g, '_');
  const safeEmployeeId = employee.employee_id.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeEmployeeName}_${safeEmployeeId}.pkpass`;

  console.log(`📱 Serving pass for download: ${fileName}`);
  console.log(`   File size: ${(passBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);

  // CRITICAL: Set proper headers for iPhone download
  // These headers are REQUIRED for iPhone to recognize and download the pass
  res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', passBuffer.length);

  // Additional headers for better compatibility
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // CRITICAL: Send as binary
  res.status(HTTP_STATUS.OK).send(passBuffer);

  fs.unlink(passFilePath, (err) => {
    if (err) {
      console.error(`Failed to delete Apple Wallet pass: ${passFilePath}`, err);
    } else {
      console.log(`✅ Apple Wallet pass deleted: ${passFilePath}`);
    }
  });
});
