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


/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone_number
 *               - address
 *               - department_id
 *               - age
 *               - designation
 *               - about_me
 *               - joining_date
 *               - profile_image
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone_number:
 *                 type: string
 *               address:
 *                 type: string
 *               department_id:
 *                 type: string
 *               designation:
 *                 type: string
 *               age:
 *                 type: number
 *               about_me:
 *                 type: string
 *               joining_date:
 *                 type: string
 *                 format: date
 *               profile_image:
 *                 type: string
 *                 format: binary
 *               social_links:
 *                 type: object
 *                 properties:
 *                   facebook:
 *                     type: string
 *                   twitter:
 *                     type: string
 *                   instagram:
 *                     type: string
 *                   youtube:
 *                     type: string
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get all employees
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering employees
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Field to sort by (e.g., name)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of employees
 *       401:
 *         description: Unauthorized
 */

// Create and get all employees
employeeRoutes
  .route('/')
  .post(upload.single('profile_image'), validateCreateEmployee, validateRequest, createEmployee)
  .get(getEmployees);


/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get an employee by ID
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee found
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Employee not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /employees/{id}:
 *   patch:
 *     summary: Update an employee by ID
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone_number:
 *                 type: string
 *               address:
 *                 type: string
 *               department_id:
 *                 type: string
 *               designation:
 *                 type: string
 *               age:
 *                 type: number
 *               about_me:
 *                 type: string
 *               joining_date:
 *                 type: string
 *                 format: date
 *               profile_image:
 *                 type: string
 *                 format: binary
 *               social_links:
 *                 type: object
 *                 properties:
 *                   facebook:
 *                     type: string
 *                   twitter:
 *                     type: string
 *                   instagram:
 *                     type: string
 *                   youtube:
 *                     type: string
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Delete an employee by ID
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       400:
 *         description: Invalid input or password
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */


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
