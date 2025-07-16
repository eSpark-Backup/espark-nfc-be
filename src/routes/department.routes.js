import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller.js';
import verifyToken from '../middlewares/verifyToken.js';
import upload from '../middlewares/imageUpload.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateDepartmentId,
} from '../validators/department.validator.js';
import verifyReenteredPassword from '../middlewares/verifyReenteredPassword.js';
import requirePassword from '../middlewares/requirePassword.js';
import { reenteredPasswordValidator } from '../validators/shared/reenteredPasswordValidator.js';

const router = express.Router();

// Apply authentication to all department routes
router.use(verifyToken);

// Create and get all departments
router
  .route('/')
  .post(upload.single('image'), validateCreateDepartment, validateRequest, createDepartment)
  .get(getAllDepartments);

// Get, update, and delete department by ID
router
  .route('/:id')
  .get(validateDepartmentId, validateRequest, getDepartmentById)
  .patch(
    validateDepartmentId,
    upload.single('image'),
    validateUpdateDepartment,
    validateRequest,
    updateDepartment
  )
  .delete(requirePassword, validateDepartmentId, reenteredPasswordValidator, validateRequest, verifyReenteredPassword, deleteDepartment);

export default router;
