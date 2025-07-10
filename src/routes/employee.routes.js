import express from 'express';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller.js';
import validateRequest from '../middlewares/validateRequest.js';
import verifyToken from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';
import {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateEmployeeId,
} from '../validators/employee.validator.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Create and get employees
router
  .route('/')
  .post(upload.single('profile_image'), validateCreateEmployee, validateRequest, createEmployee)
  .get(getEmployees);

// Get, update, delete by ID
router
  .route('/:id')
  .get(validateEmployeeId, validateRequest, getEmployeeById)
  .patch(upload.single('profile_image'), validateUpdateEmployee, validateRequest, updateEmployee)
  .delete(validateEmployeeId, validateRequest, deleteEmployee);

export default router;
