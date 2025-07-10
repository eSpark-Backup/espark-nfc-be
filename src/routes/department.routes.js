import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller.js';
import verifyToken from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateDepartmentId,
} from '../validators/department.validator.js';

const router = express.Router();

// 🔒 Apply authentication to all department routes
router.use(verifyToken);

// 📌 Create and get all departments
router
  .route('/')
  .post(upload.single('profile_image'), validateCreateDepartment, validateRequest, createDepartment)
  .get(getAllDepartments);

// 📌 Get, update, delete department by ID
router
  .route('/:id')
  .get(validateDepartmentId, validateRequest, getDepartmentById)
  .patch(
    upload.single('profile_image'),
    validateUpdateDepartment,
    validateRequest,
    updateDepartment
  )
  .delete(validateDepartmentId, validateRequest, deleteDepartment);

export default router;
