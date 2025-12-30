import express from 'express';
import {
  generateAppleWalletPass,
  downloadAppleWalletPass,
  getAppleWalletStatus,
  updateAppleWalletPass,
  deactivateAppleWalletPass,
  getAllEmployeesWithAppleWallet,
  bulkGenerateAppleWalletPasses,
  cleanupOldApplePasses,
} from '../controllers/appleWallet.controller.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { verifyToken } from '../middlewares/verifyToken.js';
import { validateEmployeeId } from '../validators/employee.validator.js';
import { validateBulkGenerate } from '../validators/appleWallet.validator.js';
import { companyProfileExists } from '../middlewares/companyProfileExists.js';

export const appleWalletRoutes = express.Router();

// Apply authentication and company profile check to all routes
appleWalletRoutes.use(verifyToken, companyProfileExists);

/**
 * @swagger
 * /api/employees/wallet/apple/all:
 *   get:
 *     summary: Get all employees with Apple Wallet passes
 *     tags: [Apple Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees with Apple Wallet passes retrieved successfully
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
 *                   example: Employees with Apple Wallet passes retrieved successfully
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
appleWalletRoutes.route('/all').get(getAllEmployeesWithAppleWallet);

/**
 * @swagger
 * /api/employees/wallet/apple/bulk-generate:
 *   post:
 *     summary: Bulk generate Apple Wallet passes for multiple employees
 *     tags: [Apple Wallet]
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
appleWalletRoutes
  .route('/bulk-generate')
  .post(validateBulkGenerate, validateRequest, bulkGenerateAppleWalletPasses);

/**
 * @swagger
 * /api/employees/wallet/apple/cleanup:
 *   post:
 *     summary: Cleanup old Apple Wallet pass files (older than 24 hours)
 *     tags: [Apple Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
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
 *                   example: Cleanup completed. 5 old pass file(s) deleted.
 *                 deleted_count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized
 */
appleWalletRoutes.route('/cleanup').post(cleanupOldApplePasses);

/**
 * @swagger
 * /api/employees/{id}/wallet/apple/generate:
 *   post:
 *     summary: Generate Apple Wallet pass for an employee
 *     tags: [Apple Wallet]
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
 *         description: Apple Wallet pass generated successfully
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
 *                   example: Apple Wallet pass generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee_id:
 *                       type: string
 *                       example: ES01
 *                     employee_name:
 *                       type: string
 *                       example: John Doe
 *                     serial_number:
 *                       type: string
 *                       example: EMP-507f1f77bcf86cd799439011-1702890123456
 *                     file_name:
 *                       type: string
 *                       example: employee_507f1f77bcf86cd799439011_1702890123456.pkpass
 *                     file_size:
 *                       type: integer
 *                       example: 245678
 *                     generated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Employee or company profile not found
 *       401:
 *         description: Unauthorized
 */
appleWalletRoutes
  .route('/:id/generate')
  .post(validateEmployeeId, validateRequest, generateAppleWalletPass);

/**
 * @swagger
 * /api/employees/{id}/wallet/apple/download:
 *   get:
 *     summary: Download Apple Wallet pass (.pkpass file) for an employee
 *     tags: [Apple Wallet]
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
 *         description: Apple Wallet pass file (.pkpass)
 *         content:
 *           application/vnd.apple.pkpass:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Employee or pass not found
 *       401:
 *         description: Unauthorized
 */
appleWalletRoutes
  .route('/:id/download')
  .get(validateEmployeeId, validateRequest, downloadAppleWalletPass);

/**
 * @swagger
 * /api/employees/{id}/wallet/apple/status:
 *   get:
 *     summary: Get Apple Wallet pass status for an employee
 *     tags: [Apple Wallet]
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
 *         description: Apple Wallet pass status retrieved successfully
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
 *                     status:
 *                       type: string
 *                       example: ACTIVE
 *                     serial_number:
 *                       type: string
 *                     generation_count:
 *                       type: integer
 *                     file_size:
 *                       type: integer
 *       404:
 *         description: Employee not found
 *       401:
 *         description: Unauthorized
 */
appleWalletRoutes
  .route('/:id/status')
  .get(validateEmployeeId, validateRequest, getAppleWalletStatus);

/**
 * @swagger
 * /api/employees/{id}/wallet/apple/update:
 *   patch:
 *     summary: Update/Regenerate Apple Wallet pass for an employee
 *     tags: [Apple Wallet]
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
 *         description: Apple Wallet pass updated successfully
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
 *                   example: Apple Wallet pass updated successfully
 *                 data:
 *                   type: object
 *       404:
 *         description: Employee or company profile not found
 *       401:
 *         description: Unauthorized
 */
appleWalletRoutes
  .route('/:id/update')
  .patch(validateEmployeeId, validateRequest, updateAppleWalletPass);

/**
 * @swagger
 * /api/employees/{id}/wallet/apple/deactivate:
 *   delete:
 *     summary: Deactivate/Expire Apple Wallet pass for an employee
 *     tags: [Apple Wallet]
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
 *         description: Apple Wallet pass deactivated successfully
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
 *                   example: Apple Wallet pass deactivated successfully
 *                 data:
 *                   type: object
 *       404:
 *         description: Employee or pass not found
 *       401:
 *         description: Unauthorized
 */
appleWalletRoutes
  .route('/:id/deactivate')
  .delete(validateEmployeeId, validateRequest, deactivateAppleWalletPass);
