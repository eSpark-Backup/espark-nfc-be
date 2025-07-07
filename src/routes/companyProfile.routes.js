import express from 'express';
import {
  createCompanyProfile,
  getCompanyProfile,
  updateCompanyProfile,
  deleteCompanyProfile,
} from '../controllers/companyProfile.controller.js';
import verifyToken from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js'; // no cloudinaryUpload anymore
import validateRequest from '../middlewares/validateRequest.js';
import {
  validateCreateCompanyProfile,
  validateUpdateCompanyProfile,
  validateCompanyProfileId,
} from '../validators/companyProfile.validator.js';
import isSuperAdmin from '../middlewares/isSuperAdmin.js';

const router = express.Router();

router.use(verifyToken, isSuperAdmin);

router.post(
  '/',
  upload.single('profile_image'),
  validateCreateCompanyProfile,
  validateRequest,
  createCompanyProfile
);

router.get('/', getCompanyProfile);

router.patch(
  '/:id',
  upload.single('profile_image'),
  validateUpdateCompanyProfile,
  validateRequest,
  updateCompanyProfile
);

router.delete('/:id', validateCompanyProfileId, validateRequest, deleteCompanyProfile);

export default router;
