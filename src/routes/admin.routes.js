import express from 'express';
import {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  changePassword,
  resetPasswordBySuperAdmin,
  sendEmailVerificationCode,
  verifyEmailCode,
} from '../controllers/admin.controller.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isSuperAdmin from '../middlewares/isSuperAdmin.js';
import validateRequest from '../middlewares/validateRequest.js';
import upload from '../middlewares/uploadMiddleware.js';
import {
  validateCreateAdmin,
  validateUpdateAdmin,
  validateAdminId,
  validateResetAdminPassword,
  validateChangeOwnPassword,
} from '../validators/admin.validator.js';

const router = express.Router();

// ✅ Allow logged-in admin to resend verification code
router.post('/send-email-verification', verifyToken, sendEmailVerificationCode);

// ✅ Allow logged-in admin to verify email using code
router.post('/verify-email', verifyToken, verifyEmailCode);

// 🔐 Allow logged-in admin to change their own password
router.put(
  '/change-password',
  verifyToken,
  validateChangeOwnPassword,
  validateRequest,
  changePassword
);

// 🔐 Only super admin can access admin management routes
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
  .patch(
    validateAdminId,
    upload.single('profile_image'),
    validateUpdateAdmin,
    validateRequest,
    updateAdmin
  )
  .delete(validateAdminId, validateRequest, deleteAdmin);

// ✅ Reset admin password (super admin only)
router.put(
  '/:id/reset-password',
  validateResetAdminPassword,
  validateRequest,
  resetPasswordBySuperAdmin
);

export default router;
