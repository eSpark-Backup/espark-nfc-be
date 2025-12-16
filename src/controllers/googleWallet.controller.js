import { Employee } from '../models/employee.model.js';
import { CompanyProfile } from '../models/companyProfile.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { CustomError } from '../utils/customError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { googleWalletGenerator } from '../utils/wallet/googleWalletGenerator.js';
import { attachPresignedImageUrl } from '../utils/imageHelper.js';
import mongoose from 'mongoose';

/**
 * @desc    Generate Google Wallet pass for an employee
 * @route   POST /api/employees/:id/wallet/google/generate
 * @access  Private (Admin/Super Admin)
 */
export const generateGoogleWalletPass = asyncWrapper(async (req, res, next) => {
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

  // Generate Google Wallet pass
  const result = await googleWalletGenerator.generateCompletePass(
    // employee.toObject(),
    // companyProfile.toObject()
    employee,
    companyProfile
  );

  // Update employee record with pass information
  await employee.updateGoogleWalletPass({
    objectId: result.objectId,
    saveUrl: result.saveUrl,
  });

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: result.message,
    data: {
      employee_id: employee.employee_id,
      employee_name: employee.name,
      object_id: result.objectId,
      save_url: result.saveUrl,
      is_new: result.isNew,
      generated_at: new Date(),
    },
  });
});

/**
 * @desc    Get Google Wallet save URL for an employee (if pass already exists)
 * @route   GET /api/employees/:id/wallet/google/link
 * @access  Private (Admin/Super Admin)
 */
export const getGoogleWalletLink = asyncWrapper(async (req, res, next) => {
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
  if (
    !employee.wallet_passes?.google?.save_url ||
    employee.wallet_passes?.google?.status === 'NOT_GENERATED'
  ) {
    return next(
      new CustomError(
        HTTP_STATUS.NOT_FOUND,
        'Google Wallet pass not generated yet. Please generate the pass first.'
      )
    );
  }

  // Check if pass is expired
  if (employee.wallet_passes?.google?.status === 'EXPIRED') {
    return next(
      new CustomError(
        HTTP_STATUS.GONE,
        'Google Wallet pass has been expired. Please regenerate the pass.'
      )
    );
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Google Wallet link retrieved successfully',
    data: {
      employee_id: employee.employee_id,
      employee_name: employee.name,
      save_url: employee.wallet_passes.google.save_url,
      object_id: employee.wallet_passes.google.object_id,
      status: employee.wallet_passes.google.status,
      last_generated: employee.wallet_passes.google.last_generated,
      generation_count: employee.wallet_passes.google.generation_count,
    },
  });
});

/**
 * @desc    Get Google Wallet pass status for an employee
 * @route   GET /api/employees/:id/wallet/google/status
 * @access  Private (Admin/Super Admin)
 */
export const getGoogleWalletStatus = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;

  // Find employee by _id or employee_id
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { employee_id: { $regex: new RegExp(`^${id}$`, 'i') } };

  const employee = await Employee.findOne(query);

  if (!employee) {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, 'Employee not found'));
  }

  // Get pass details from Google Wallet API
  const passDetails = await googleWalletGenerator.getPassDetails(employee._id);

  // Prepare response data
  const statusData = {
    employee_id: employee.employee_id,
    employee_name: employee.name,
    pass_exists: passDetails.exists,
    local_status: employee.wallet_passes?.google?.status || 'NOT_GENERATED',
    google_status: passDetails.exists ? passDetails.state : null,
    object_id: passDetails.objectId,
    save_url: employee.wallet_passes?.google?.save_url || null,
    last_generated: employee.wallet_passes?.google?.last_generated || null,
    generation_count: employee.wallet_passes?.google?.generation_count || 0,
  };

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Google Wallet pass status retrieved successfully',
    data: statusData,
  });
});

/**
 * @desc    Update/Regenerate Google Wallet pass for an employee
 * @route   PATCH /api/employees/:id/wallet/google/update
 * @access  Private (Admin/Super Admin)
 */
export const updateGoogleWalletPass = asyncWrapper(async (req, res, next) => {
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

  // Attach presigned URLs for images
  if (employee.profile_image?.image_key) {
    await attachPresignedImageUrl(employee, 'profile_image');
  }

  if (companyProfile.profile_image?.image_key) {
    await attachPresignedImageUrl(companyProfile, 'profile_image');
  }

  // Regenerate pass (this will update existing pass in Google Wallet)
  const result = await googleWalletGenerator.generateCompletePass(
    // employee.toObject(),
    // companyProfile.toObject()
    employee,
    companyProfile
  );

  // Update employee record
  await employee.updateGoogleWalletPass({
    objectId: result.objectId,
    saveUrl: result.saveUrl,
  });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Google Wallet pass updated successfully',
    data: {
      employee_id: employee.employee_id,
      employee_name: employee.name,
      object_id: result.objectId,
      save_url: result.saveUrl,
      updated_at: new Date(),
    },
  });
});

/**
 * @desc    Deactivate/Expire Google Wallet pass for an employee
 * @route   DELETE /api/employees/:id/wallet/google/deactivate
 * @access  Private (Admin/Super Admin)
 */
export const deactivateGoogleWalletPass = asyncWrapper(async (req, res, next) => {
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
  if (
    !employee.wallet_passes?.google?.object_id ||
    employee.wallet_passes?.google?.status === 'NOT_GENERATED'
  ) {
    return next(
      new CustomError(HTTP_STATUS.NOT_FOUND, 'No active Google Wallet pass found for this employee')
    );
  }

  // Deactivate pass in Google Wallet
  const result = await googleWalletGenerator.deactivatePass(employee._id);

  if (result.success) {
    // Update local database
    await employee.deactivateGoogleWalletPass();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Google Wallet pass deactivated successfully',
      data: {
        employee_id: employee.employee_id,
        employee_name: employee.name,
        object_id: result.objectId,
        deactivated_at: new Date(),
      },
    });
  } else {
    return next(new CustomError(HTTP_STATUS.NOT_FOUND, result.message));
  }
});

/**
 * @desc    Get all employees with Google Wallet passes
 * @route   GET /api/employees/wallet/google/all
 * @access  Private (Admin/Super Admin)
 */
export const getAllEmployeesWithGoogleWallet = asyncWrapper(async (req, res) => {
  const employees = await Employee.find({
    'wallet_passes.google.status': { $in: ['ACTIVE', 'EXPIRED'] },
  })
    .select('name email employee_id designation wallet_passes.google')
    .populate('department_id', 'name')
    .sort({ 'wallet_passes.google.last_generated': -1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: employees.length
      ? 'Employees with Google Wallet passes retrieved successfully'
      : 'No employees with Google Wallet passes found',
    count: employees.length,
    data: employees,
  });
});

/**
 * @desc    Bulk generate Google Wallet passes for multiple employees
 * @route   POST /api/employees/wallet/google/bulk-generate
 * @access  Private (Admin/Super Admin)
 */
export const bulkGenerateGoogleWalletPasses = asyncWrapper(async (req, res, next) => {
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
      const result = await googleWalletGenerator.generateCompletePass(
        // employee.toObject(),
        // companyProfile.toObject()
        employee,
        companyProfile
      );

      // Update employee record
      await employee.updateGoogleWalletPass({
        objectId: result.objectId,
        saveUrl: result.saveUrl,
      });

      results.successful.push({
        employee_id: employee.employee_id,
        employee_name: employee.name,
        object_id: result.objectId,
        save_url: result.saveUrl,
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
