import express from 'express';
import {
  generateAppleWalletPass,
  downloadAppleWalletPass,
} from '../controllers/appleWallet.controller.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { validateEmployeeId } from '../validators/employee.validator.js';

export const appleWalletRoutes = express.Router();

// Apply authentication and company profile check to all routes
// appleWalletRoutes.use(verifyToken, companyProfileExists);

/**
 * @swagger
 * /api/employees/wallet/apple/{id}/generate:
 *   post:
 *     summary: Generate Apple Wallet pass for an employee
 *     tags: [Apple Wallet]
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
 * /api/employees/wallet/apple/{id}/download:
 *   get:
 *     summary: Download Apple Wallet pass (.pkpass file) for an employee
 *     tags: [Apple Wallet]
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
