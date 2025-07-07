import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller.js';
import verifyToken from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateDepartmentId,
} from '../validators/department.validator.js';

const router = express.Router();

router.use(verifyToken);

router.post(
  '/',
  upload.single('profile_image'),
  validateCreateDepartment,
  validateRequest,
  createDepartment
);

router.get('/', getAllDepartments);

router.get('/:id', validateDepartmentId, validateRequest, getDepartmentById);

router.patch(
  '/:id',
  upload.single('profile_image'),
  validateUpdateDepartment,
  validateRequest,
  updateDepartment
);

router.delete('/:id', validateDepartmentId, validateRequest, deleteDepartment);

export default router;
