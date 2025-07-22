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
 * /api/departments:
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
 * /api/departments:
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
 *           minimum: 1
 *         description: Page number (default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of records per page (default is 10, max is 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Keyword to search department names
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, created_at, updated_at]
 *         description: Field to sort by (default is created_at)
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default is desc)
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Department'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total_count:
 *                       type: integer
 *                     current_page:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *                     per_page:
 *                       type: integer
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
 * /api/departments/{id}:
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
 * /api/departments/{id}:
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
 * /api/departments/{id}:
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