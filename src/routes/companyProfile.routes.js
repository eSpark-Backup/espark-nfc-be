import express from 'express';
import {
  createCompanyProfile,
  getCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile,
} from '../controllers/companyProfile.controller.js';
import verifyToken from '../middlewares/authMiddleware.js';
import upload, { cloudinaryUpload } from '../middlewares/multer.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  validateCreateCompanyProfile,
  validateUpdateCompanyProfile,
  validateCompanyProfileId,
} from '../validators/companyProfile.validator.js';

const router = express.Router();

// router.use(verifyToken);

router.post(
  '/',
  upload.single('profile_image'),
  cloudinaryUpload('company'),
  validateCreateCompanyProfile,
  validateRequest,
  createCompanyProfile
);

router.get('/', getCompanyProfile);

router.patch(
  '/:id',
  upload.single('profile_image'),
  cloudinaryUpload('company'),
  validateUpdateCompanyProfile,
  validateRequest,
  updateCompanyProfile
);

router.delete(
  '/:id',
  validateCompanyProfileId,
  validateRequest,
  deleteCompanyProfile
);

export default router;
