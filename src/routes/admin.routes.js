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
import verifyToken from '../middlewares/verifyToken.js';
import isSuperAdmin from '../middlewares/isSuperAdmin.js';
import validateRequest from '../middlewares/validateRequest.js';
import upload from '../middlewares/imageUpload.js';
import {
  validateCreateAdmin,
  validateUpdateAdmin,
  validateAdminId,
  validateResetAdminPassword,
  validateChangeOwnPassword,
} from '../validators/admin.validator.js';
import {
  emailVerificationRateLimiter,
  resetPasswordRateLimiter,
  changePasswordRateLimiter,
} from '../middlewares/rateLimiters.js';

const router = express.Router();

// Public for logged-in admin: Email verification
router
  .route('/send-email-verification')
  .post(verifyToken, emailVerificationRateLimiter, sendEmailVerificationCode);

router.route('/verify-email').post(verifyToken, verifyEmailCode);

// Logged-in admin: Change own password
router
  .route('/change-password')
  .put(
    verifyToken,
    changePasswordRateLimiter,
    validateChangeOwnPassword,
    validateRequest,
    changePassword
  );

// Super admin-only routes
router.use(verifyToken, isSuperAdmin);

// Create admin / Get all admins
router
  .route('/')
  .post(upload.single('profile_image'), validateCreateAdmin, validateRequest, createAdmin)
  .get(getAllAdmins);

// Get / Update / Delete specific admin by ID
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

// Reset password for specific admin
router
  .route('/:id/reset-password')
  .put(
    resetPasswordRateLimiter,
    validateResetAdminPassword,
    validateRequest,
    resetPasswordBySuperAdmin
  );

export default router;
