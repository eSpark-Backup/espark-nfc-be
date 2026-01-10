import express from 'express';
import { generateGoogleWalletPass } from '../controllers/googleWallet.controller.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { validateEmployeeId } from '../validators/employee.validator.js';

export const googleWalletRoutes = express.Router();

/**
 * @swagger
 * /api/employees/wallet/google/{id}/generate:
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
