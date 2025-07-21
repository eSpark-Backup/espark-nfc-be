import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { upload } from '../middlewares/imageUpload.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateDepartmentId,
} from '../validators/department.validator.js';
import { verifyReenteredPassword } from '../middlewares/verifyReenteredPassword.js';
import { requirePassword } from '../middlewares/requirePassword.js';
import { reenteredPasswordValidator } from '../validators/shared/reenteredPasswordValidator.js';
import { companyProfileExists } from '../middlewares/companyProfileExists.js';

export const departmentRoutes = express.Router();

// Apply authentication to all department routes
departmentRoutes.use(verifyToken, companyProfileExists);


/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Create a new department
 *     tags: [Departments]
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
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Department created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by department name
 *     responses:
 *       200:
 *         description: List of departments
 *       401:
 *         description: Unauthorized
 */

// Create and get all departments
departmentRoutes
  .route('/')
  .post(upload.single('image'), validateCreateDepartment, validateRequest, createDepartment)
  .get(getAllDepartments);


/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get a department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department details
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Department not found
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /departments/{id}:
 *   patch:
 *     summary: Update a department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
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
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       400:
 *         description: Invalid input or ID
 *       404:
 *         description: Department not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Delete a department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Department ID
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
 *         description: Department deleted successfully
 *       400:
 *         description: Invalid password or ID
 *       404:
 *         description: Department not found
 *       401:
 *         description: Unauthorized
 */

// Get, update, and delete department by ID
departmentRoutes
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