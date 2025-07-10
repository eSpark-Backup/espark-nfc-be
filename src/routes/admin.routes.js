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
import upload from '../middlewares/uploadMiddleware.js';
import {
  validateCreateAdmin,
  validateUpdateAdmin,
  validateAdminId,
} from '../validators/admin.validator.js';

const router = express.Router();

// 🔐 Only super admin can access admin routes
router.use(verifyToken, isSuperAdmin);

// 📌 Create admin / Get all admins
router
  .route('/')
  .post(upload.single('profile_image'), validateCreateAdmin, validateRequest, createAdmin)
  .get(getAllAdmins);

// 📌 Get / Update / Delete admin by ID
router
  .route('/:id')
  .get(validateAdminId, validateRequest, getAdminById)
  .patch(upload.single('profile_image'), validateUpdateAdmin, validateRequest, updateAdmin)
  .delete(validateAdminId, validateRequest, deleteAdmin);

export default router;
