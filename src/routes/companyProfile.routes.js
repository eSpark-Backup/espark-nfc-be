import express from 'express';
import {
  createCompanyProfile,
  getCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile,
} from '../controllers/companyProfile.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { isSuperAdmin } from '../middlewares/isSuperAdmin.js';
import { upload } from '../middlewares/imageUpload.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  validateCreateCompanyProfile,
  validateUpdateCompanyProfile,
} from '../validators/companyProfile.validator.js';
import { requirePassword } from '../middlewares/requirePassword.js';
import { verifyReenteredPassword } from '../middlewares/verifyReenteredPassword.js';
import { reenteredPasswordValidator } from '../validators/shared/reenteredPasswordValidator.js';

export const companyProfileRoutes = express.Router();

// Only super admin can access company profile routes
companyProfileRoutes.use(verifyToken, isSuperAdmin);

// All CRUD operations on the same '/' route
companyProfileRoutes
  .route('/')
  .post(
    upload.single('profile_image'),
    validateCreateCompanyProfile,
    validateRequest,
    createCompanyProfile
  )
  .get(getCompanyProfile)
  .patch(
    upload.single('profile_image'),
    validateUpdateCompanyProfile,
    validateRequest,
    updateCompanyProfile
  )
  .delete(requirePassword, reenteredPasswordValidator, verifyReenteredPassword, deleteCompanyProfile);

  