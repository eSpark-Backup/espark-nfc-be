import express from 'express';
import {
  getPass,
  registerDevice,
  unregisterDevice,
  getUpdatedPasses,
  logError,
} from '../controllers/appleWalletWebService.controller.js';

export const appleWalletWebServiceRoutes = express.Router();

/**
 * Apple Wallet Web Service Routes
 * These routes follow Apple's PassKit Web Service specification
 * https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes
 */

/**
 * @swagger
 * /api/apple-wallet/v1/passes/{passTypeId}/{serialNumber}:
 *   get:
 *     summary: Get the latest version of a pass (Apple Wallet web service)
 *     tags: [Apple Wallet Web Service]
 *     description: Apple Wallet calls this endpoint to check for pass updates
 *     parameters:
 *       - in: path
 *         name: passTypeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pass type identifier (e.g., pass.com.example.employee)
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique pass serial number
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: ApplePass authentication token
 *       - in: header
 *         name: If-Modified-Since
 *         required: false
 *         schema:
 *           type: string
 *         description: Only return pass if modified after this date
 *     responses:
 *       200:
 *         description: Latest pass returned
 *         content:
 *           application/vnd.apple.pkpass:
 *             schema:
 *               type: string
 *               format: binary
 *       304:
 *         description: Pass not modified since If-Modified-Since header
 *       401:
 *         description: Invalid authentication token
 *       410:
 *         description: Pass no longer available
 */
appleWalletWebServiceRoutes.route('/v1/passes/:passTypeId/:serialNumber').get(getPass);

/**
 * @swagger
 * /api/apple-wallet/v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}:
 *   post:
 *     summary: Register a device for push notifications
 *     tags: [Apple Wallet Web Service]
 *     description: Apple Wallet calls this to register for pass updates
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique device identifier
 *       - in: path
 *         name: passTypeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pushToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: Device registered successfully
 *       200:
 *         description: Device already registered
 *       401:
 *         description: Invalid authentication
 */
appleWalletWebServiceRoutes
  .route('/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber')
  .post(registerDevice);

/**
 * @swagger
 * /api/apple-wallet/v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}:
 *   delete:
 *     summary: Unregister a device from push notifications
 *     tags: [Apple Wallet Web Service]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: passTypeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device unregistered successfully
 *       401:
 *         description: Invalid authentication
 */
appleWalletWebServiceRoutes
  .route('/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber')
  .delete(unregisterDevice);

/**
 * @swagger
 * /api/apple-wallet/v1/devices/{deviceId}/registrations/{passTypeId}:
 *   get:
 *     summary: Get serial numbers of passes that have been updated
 *     tags: [Apple Wallet Web Service]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: passTypeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: passesUpdatedSince
 *         schema:
 *           type: string
 *         description: ISO 8601 date
 *     responses:
 *       200:
 *         description: List of updated pass serial numbers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lastUpdated:
 *                   type: string
 *                 serialNumbers:
 *                   type: array
 *                   items:
 *                     type: string
 */
appleWalletWebServiceRoutes
  .route('/v1/devices/:deviceId/registrations/:passTypeId')
  .get(getUpdatedPasses);

/**
 * @swagger
 * /api/apple-wallet/v1/log:
 *   post:
 *     summary: Log errors from Apple Wallet
 *     tags: [Apple Wallet Web Service]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logs:
 *                 type: array
 *     responses:
 *       200:
 *         description: Logs received
 */
appleWalletWebServiceRoutes.route('/v1/log').post(logError);
