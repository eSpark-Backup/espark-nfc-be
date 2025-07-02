import express from 'express';
import multer from 'multer';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employee.controller.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  validateCreateEmployee,
  validateUpdateEmployee,
  validateEmployeeId,
} from '../validators/employee.validator.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router
  .route('/')
  .post(upload.single('profile_image'), validateCreateEmployee, validateRequest, createEmployee)
  .get(getEmployees);

router
  .route('/:id')
  .get(validateEmployeeId, validateRequest, getEmployeeById)
  .patch(upload.single('profile_image'), validateUpdateEmployee, validateRequest, updateEmployee)
  .delete(deleteEmployee);

export default router;
