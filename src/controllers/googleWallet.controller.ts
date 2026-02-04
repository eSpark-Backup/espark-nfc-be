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
