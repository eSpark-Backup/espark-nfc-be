import express from 'express';
import {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} from '../controllers/admin.controller.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isSuperAdmin from '../middlewares/isSuperAdmin.js';
import validateRequest from '../middlewares/validateRequest.js';
import upload from '../middlewares/uploadMiddleware.js'; // handles S3 upload
import {
  validateCreateAdmin,
  validateUpdateAdmin,
  validateAdminId,
} from '../validators/admin.validator.js';

const router = express.Router();

router.use(verifyToken, isSuperAdmin);

// Create admin (optional image upload)
router.post(
  '/',
  upload.single('profile_image'), // handles image upload to S3
  validateCreateAdmin,
  validateRequest,
  createAdmin
);

// Get all admins
router.get('/', getAllAdmins);

// Get admin by ID
router.get('/:id', validateAdminId, validateRequest, getAdminById);

// Update admin (replace profile image if new one provided)
router.patch(
  '/:id',
  upload.single('profile_image'), // upload new image to S3 if exists
  validateUpdateAdmin,
  validateRequest,
  updateAdmin
);

// Delete admin (image deleted in controller if it exists)
router.delete('/:id', validateAdminId, validateRequest, deleteAdmin);

export default router;
