import express from 'express';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { upload } from '../middlewares/imageUpload.js';
import {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateEmployeeId,
} from '../validators/employee.validator.js';
import { verifyReenteredPassword } from '../middlewares/verifyReenteredPassword.js';
import { requirePassword } from '../middlewares/requirePassword.js';
import { reenteredPasswordValidator } from '../validators/shared/reenteredPasswordValidator.js';
import { companyProfileExists } from '../middlewares/companyProfileExists.js';

export const employeeRoutes = express.Router();

// Apply authentication middleware to all routes
employeeRoutes.use(verifyToken, companyProfileExists);

// Create and get all employees
employeeRoutes
  .route('/')
  .post(upload.single('profile_image'), validateCreateEmployee, validateRequest, createEmployee)
  .get(getEmployees);

// Get, update, and delete employee by ID
employeeRoutes
  .route('/:id')
  .get(validateEmployeeId, validateRequest, getEmployeeById)
  .patch(
    validateEmployeeId,
    upload.single('profile_image'),
    validateUpdateEmployee,
    validateRequest,
    updateEmployee
  )
  .delete(requirePassword, validateEmployeeId, reenteredPasswordValidator, validateRequest, verifyReenteredPassword, deleteEmployee);
