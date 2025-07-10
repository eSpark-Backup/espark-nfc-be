import express from 'express';
import {
  createCompanyProfile,
  getCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile,
} from '../controllers/companyProfile.controller.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isSuperAdmin from '../middlewares/isSuperAdmin.js';
import upload from '../middlewares/uploadMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  validateCreateCompanyProfile,
  validateUpdateCompanyProfile,
} from '../validators/companyProfile.validator.js';

const router = express.Router();

// 🔒 Only super admin can access company profile routes
router.use(verifyToken, isSuperAdmin);

// 📌 All CRUD operations on the same '/' route
router
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
  .delete(deleteCompanyProfile);

export default router;
