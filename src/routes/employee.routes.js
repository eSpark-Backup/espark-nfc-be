import express from 'express';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller.js';
import validateRequest from '../middlewares/validateRequest.js';
import verifyToken from '../middlewares/verifyToken.js';
import upload from '../middlewares/imageUpload.js';
import {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateEmployeeId,
} from '../validators/employee.validator.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Create and get all employees
router
  .route('/')
  .post(upload.single('profile_image'), validateCreateEmployee, validateRequest, createEmployee)
  .get(getEmployees);

// Get, update, and delete employee by ID
router
  .route('/:id')
  .get(validateEmployeeId, validateRequest, getEmployeeById)
  .patch(
    validateEmployeeId,
    upload.single('profile_image'),
    validateUpdateEmployee,
    validateRequest,
    updateEmployee
  )
  .delete(validateEmployeeId, validateRequest, deleteEmployee);

export default router;
