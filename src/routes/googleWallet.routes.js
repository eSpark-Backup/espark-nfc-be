import express from 'express';
import {
  generateGoogleWalletPass,
  getGoogleWalletLink,
  getGoogleWalletStatus,
  updateGoogleWalletPass,
  deactivateGoogleWalletPass,
  getAllEmployeesWithGoogleWallet,
  bulkGenerateGoogleWalletPasses,
} from '../controllers/googleWallet.controller.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { validateEmployeeId } from '../validators/employee.validator.js';
import { validateBulkGenerate } from '../validators/googleWallet.validator.js';
import { companyProfileExists } from '../middlewares/companyProfileExists.js';

export const googleWalletRoutes = express.Router();

// Apply authentication and company profile check to all routes
// googleWalletRoutes.use(verifyToken, companyProfileExists);

/**
 * @swagger
 * /api/employees/all:
 *   get:
 *     summary: Get all employees with Google Wallet passes
 *     tags: [Google Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees with Google Wallet passes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Employees with Google Wallet passes retrieved successfully
 *                 count:
 *                   type: integer
 *                   example: 25
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
googleWalletRoutes.route('/all').get(getAllEmployeesWithGoogleWallet);

/**
 * @swagger
 * /api/employees/bulk-generate:
 *   post:
 *     summary: Bulk generate Google Wallet passes for multiple employees
 *     tags: [Google Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_ids
 *             properties:
 *               employee_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["ES01", "ES02", "ES03"]
 *                 description: Array of employee IDs (MongoDB _id or employee_id)
 *     responses:
 *       200:
 *         description: Bulk generation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Bulk generation completed. 3 successful, 0 failed.
 *                 data:
 *                   type: object
 *                   properties:
 *                     successful:
 *                       type: array
 *                       items:
 *                         type: object
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
googleWalletRoutes
  .route('/bulk-generate')
  .post(validateBulkGenerate, validateRequest, bulkGenerateGoogleWalletPasses);

/**
 * @swagger
 * /api/employees/{id}/generate:
 *   post:
 *     summary: Generate Google Wallet pass for an employee
 *     tags: [Google Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID (MongoDB _id or employee_id like ES01)
 *     responses:
 *       201:
 *         description: Google Wallet pass generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Google Wallet pass created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee_id:
 *                       type: string
 *                       example: ES01
 *                     employee_name:
 *                       type: string
 *                       example: John Doe
 *                     object_id:
 *                       type: string
 *                       example: 3388000000022345678.employee_507f1f77bcf86cd799439011
 *                     save_url:
 *                       type: string
 *                       example: https://pay.google.com/gp/v/save/eyJhbGc...
 *                     is_new:
 *                       type: boolean
 *                       example: true
 *                     generated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Employee or company profile not found
 *       401:
 *         description: Unauthorized
 */
googleWalletRoutes
  .route('/:id/generate')
  .post(validateEmployeeId, validateRequest, generateGoogleWalletPass);

/**
 * @swagger
 * /api/employees/{id}/link:
 *   get:
 *     summary: Get Google Wallet save URL for an employee
 *     tags: [Google Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID (MongoDB _id or employee_id like ES01)
 *     responses:
 *       200:
 *         description: Google Wallet link retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Google Wallet link retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee_id:
 *                       type: string
 *                     save_url:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: ACTIVE
 *       404:
 *         description: Employee not found or pass not generated
 *       410:
 *         description: Pass has been expired
 *       401:
 *         description: Unauthorized
 */
googleWalletRoutes.route('/:id/link').get(validateEmployeeId, validateRequest, getGoogleWalletLink);

/**
 * @swagger
 * /api/employees/{id}/status:
 *   get:
 *     summary: Get Google Wallet pass status for an employee
 *     tags: [Google Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID (MongoDB _id or employee_id like ES01)
 *     responses:
 *       200:
 *         description: Google Wallet pass status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     pass_exists:
 *                       type: boolean
 *                     local_status:
 *                       type: string
 *                       example: ACTIVE
 *                     google_status:
 *                       type: string
 *                       example: ACTIVE
 *                     generation_count:
 *                       type: integer
 *       404:
 *         description: Employee not found
 *       401:
 *         description: Unauthorized
 */
googleWalletRoutes
  .route('/:id/status')
  .get(validateEmployeeId, validateRequest, getGoogleWalletStatus);

/**
 * @swagger
 * /api/employees/{id}/update:
 *   patch:
 *     summary: Update/Regenerate Google Wallet pass for an employee
 *     tags: [Google Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID (MongoDB _id or employee_id like ES01)
 *     responses:
 *       200:
 *         description: Google Wallet pass updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Google Wallet pass updated successfully
 *                 data:
 *                   type: object
 *       404:
 *         description: Employee or company profile not found
 *       401:
 *         description: Unauthorized
 */
googleWalletRoutes
  .route('/:id/update')
  .patch(validateEmployeeId, validateRequest, updateGoogleWalletPass);

/**
 * @swagger
 * /api/employees/{id}/deactivate:
 *   delete:
 *     summary: Deactivate/Expire Google Wallet pass for an employee
 *     tags: [Google Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID (MongoDB _id or employee_id like ES01)
 *     responses:
 *       200:
 *         description: Google Wallet pass deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Google Wallet pass deactivated successfully
 *                 data:
 *                   type: object
 *       404:
 *         description: Employee or pass not found
 *       401:
 *         description: Unauthorized
 */
googleWalletRoutes
  .route('/:id/deactivate')
  .delete(validateEmployeeId, validateRequest, deactivateGoogleWalletPass);
