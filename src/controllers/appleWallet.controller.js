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

/**
 * @desc    Get Apple Wallet pass status for an employee
 * @route   GET /api/employees/:id/wallet/apple/status
 * @access  Private (Admin/Super Admin)
 */
export const getAppleWalletStatus = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  // Find employee by _id or employee_id
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  const employee = await Employee.findOne(query);

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  const passFilePath = employee.getAppleWalletPassPath();
  const fileExists = passFilePath ? fs.existsSync(passFilePath) : false;

  // Get file info if exists
  let fileInfo = null;
  if (fileExists) {
    fileInfo = appleWalletGenerator.getPassFileInfo(passFilePath);
  }

  // Prepare response data
  const statusData = {
    employee_id: employee.employee_id,
    employee_name: employee.name,
    pass_exists: employee.hasAppleWalletPass() && fileExists,
    status: employee.wallet_passes?.apple?.status || 'NOT_GENERATED',
    serial_number: employee.wallet_passes?.apple?.serial_number || null,
    last_generated: employee.wallet_passes?.apple?.last_generated || null,
    generation_count: employee.wallet_passes?.apple?.generation_count || 0,
    file_size: fileInfo?.size || employee.wallet_passes?.apple?.pass_size || null,
    file_path: fileExists ? passFilePath : null,
  };

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Apple Wallet pass status retrieved successfully',
    data: statusData,
  });
});

/**
 * @desc    Update/Regenerate Apple Wallet pass for an employee
 * @route   PATCH /api/employees/:id/wallet/apple/update
 * @access  Private (Admin/Super Admin)
 */
export const updateAppleWalletPass = asyncWrapper(async (req, res, next) => {
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
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  // Delete old pass file if exists
  const oldPassPath = employee.getAppleWalletPassPath();
  if (oldPassPath) {
    await appleWalletGenerator.deletePassFile(oldPassPath);
  }

  // Attach presigned URLs for images
  if (employee.profile_image?.image_key) {
    await attachPresignedImageUrl(employee, 'profile_image');
  }

  if (companyProfile.profile_image?.image_key) {
    await attachPresignedImageUrl(companyProfile, 'profile_image');
  }

  // Regenerate pass
  const result = await appleWalletGenerator.generatePass(employee, companyProfile);

  // Save new pass to file
  const fileResult = await appleWalletGenerator.savePassToFile(result.passBuffer, employee._id);

  const authToken = appleWalletGenerator.getLastAuthToken();

  // Update employee record
  await employee.updateAppleWalletPass({
    serialNumber: result.serialNumber,
    filePath: fileResult.filePath,
    size: result.passBuffer.length,
    authenticationToken: authToken,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Apple Wallet pass updated successfully',
    data: {
      employee_id: employee.employee_id,
      employee_name: employee.name,
      serial_number: result.serialNumber,
      file_name: fileResult.fileName,
      file_size: result.passBuffer.length,
      updated_at: new Date(),
    },
  });
});

/**
 * @desc    Deactivate/Expire Apple Wallet pass for an employee
 * @route   DELETE /api/employees/:id/wallet/apple/deactivate
 * @access  Private (Admin/Super Admin)
 */
export const deactivateAppleWalletPass = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  // Find employee by _id or employee_id
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
      new CustomError(HTTP_STATUS.NOT_FOUND, 'No active Apple Wallet pass found for this employee')
    );
  }

  // Delete pass file
  const passFilePath = employee.getAppleWalletPassPath();
  if (passFilePath) {
    await appleWalletGenerator.deletePassFile(passFilePath);
  }

  // Update local database
  await employee.deactivateAppleWalletPass();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Apple Wallet pass deactivated successfully',
    data: {
      employee_id: employee.employee_id,
      employee_name: employee.name,
      serial_number: employee.wallet_passes?.apple?.serial_number,
      deactivated_at: new Date(),
    },
  });
});

/**
 * @desc    Get all employees with Apple Wallet passes
 * @route   GET /api/employees/wallet/apple/all
 * @access  Private (Admin/Super Admin)
 */
export const getAllEmployeesWithAppleWallet = asyncWrapper(async (req, res) => {
  const employees = await Employee.find({
    'wallet_passes.apple.status': { $in: ['ACTIVE', 'EXPIRED'] },
  })
    .select('name email employee_id designation wallet_passes.apple')
    .populate('department_id', 'name')
    .sort({ 'wallet_passes.apple.last_generated': -1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: employees.length
      ? 'Employees with Apple Wallet passes retrieved successfully'
      : 'No employees with Apple Wallet passes found',
    count: employees.length,
    data: employees,
  });
});

/**
 * @desc    Bulk generate Apple Wallet passes for multiple employees
 * @route   POST /api/employees/wallet/apple/bulk-generate
 * @access  Private (Admin/Super Admin)
 */
export const bulkGenerateAppleWalletPasses = asyncWrapper(async (req, res, next) => {
  const { employee_ids } = req.body;

  if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
    return next(
      new CustomError(
        HTTP_STATUS.BAD_REQUEST,
        'employee_ids array is required and must not be empty'
      )
    );
  }

  // Get company profile once
  const companyProfile = await CompanyProfile.findOne();

  if (!companyProfile) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Company profile not found'));
  }

  if (companyProfile.profile_image?.image_key) {
    await attachPresignedImageUrl(companyProfile, 'profile_image');
  }

  const results = {
    successful: [],
    failed: [],
  };

  // Process each employee
  for (const empId of employee_ids) {
    try {
      const query = mongoose.Types.ObjectId.isValid(empId)
        ? { _id: empId }
        : { employee_id: { $regex: new RegExp(`^${empId}$`, 'i') } };

      const employee = await Employee.findOne(query).populate('department_id', 'name');

      if (!employee) {
        results.failed.push({
          employee_id: empId,
          error: 'Employee not found',
        });
        continue;
      }

      // Attach presigned URL
      if (employee.profile_image?.image_key) {
        await attachPresignedImageUrl(employee, 'profile_image');
      }

      // Generate pass
      const result = await appleWalletGenerator.generatePass(employee, companyProfile);

      // Save pass to file
      const fileResult = await appleWalletGenerator.savePassToFile(result.passBuffer, employee._id);

      const authToken = appleWalletGenerator.getLastAuthToken();

      // Update employee record
      await employee.updateAppleWalletPass({
        serialNumber: result.serialNumber,
        filePath: fileResult.filePath,
        size: result.passBuffer.length,
        authenticationToken: authToken,
      });

      results.successful.push({
        employee_id: employee.employee_id,
        employee_name: employee.name,
        serial_number: result.serialNumber,
        file_name: fileResult.fileName,
      });
    } catch (error) {
      results.failed.push({
        employee_id: empId,
        error: error.message,
      });
    }
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Bulk generation completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
    data: results,
  });
});

/**
 * @desc    Cleanup old Apple Wallet pass files
 * @route   POST /api/employees/wallet/apple/cleanup
 * @access  Private (Admin/Super Admin)
 */
export const cleanupOldApplePasses = asyncWrapper(async (req, res) => {
  const deletedCount = await appleWalletGenerator.cleanupOldPasses();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Cleanup completed. ${deletedCount} old pass file(s) deleted.`,
    deleted_count: deletedCount,
  });
});
