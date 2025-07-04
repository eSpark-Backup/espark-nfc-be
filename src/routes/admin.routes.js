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
import {
  validateCreateAdmin,
  validateUpdateAdmin,
  validateAdminId,
} from '../validators/admin.validator.js';

const router = express.Router();

router.use(verifyToken, isSuperAdmin);

router.post(
  '/',
  validateCreateAdmin,
  validateRequest,
  createAdmin
);


router.get('/', getAllAdmins);


router.get(
  '/:id',
  validateAdminId,
  validateRequest,
  getAdminById
);


router.patch(
  '/:id',
  validateUpdateAdmin,
  validateRequest,
  updateAdmin
);


router.delete(
  '/:id',
  validateAdminId,
  validateRequest,
  deleteAdmin
);

export default router;
