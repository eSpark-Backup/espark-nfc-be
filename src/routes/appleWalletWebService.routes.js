import express from 'express';
import {
  getPass,
  registerDevice,
  unregisterDevice,
  getUpdatedPasses,
  logError,
} from '../controllers/appleWalletWebService.controller.js';
import {
  verifyAppleWalletAuth,
  verifyAppleWalletAuthForRegistration,
  logAppleWalletRequest,
} from '../middlewares/verifyAppleWalletAuth.js';

export const appleWalletWebServiceRoutes = express.Router();

/**
 * Apple Wallet Web Service Routes
 *
 * These routes implement Apple's PassKit Web Service specification:
 * https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes
 *
 * IMPORTANT: These routes are called by Apple Wallet on iOS devices
 * Route patterns must match Apple's specification exactly!
 *
 * Base URL in pass.json should be: https://yourdomain.com/api/apple-wallet
 *
 * Route Pattern Explanation:
 * - :deviceId = Device Library Identifier (e.g., 9e693d19d15e4072bd3f1aa1d4ee0c08)
 * - :passTypeId = Pass Type Identifier (e.g., pass.com.eurosystemsint.nfc)
 * - :serialNumber = Unique pass serial number (e.g., EMP-6940295c8051fa6a20d82344-1767869159047)
 */

// Optional: Log all requests for debugging (remove in production if not needed)
appleWalletWebServiceRoutes.use(logAppleWalletRequest);

/**
 * GET /v1/passes/:passTypeId/:serialNumber
 *
 * Get the latest version of a pass
 *
 * Called by Apple Wallet to:
 * - Download pass when user adds it
 * - Check for pass updates
 *
 * Authentication: Required (ApplePass token)
 */
appleWalletWebServiceRoutes
  .route('/v1/passes/:passTypeId/:serialNumber')
  .get(verifyAppleWalletAuth, getPass);

/**
 * POST /v1/devices/:deviceId/registrations/:passTypeId/:serialNumber
 *
 * Register a device for push notifications
 *
 * Called when user adds pass to Apple Wallet
 *
 * Authentication: Required (ApplePass token)
 */
appleWalletWebServiceRoutes
  .route('/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber')
  .post(verifyAppleWalletAuthForRegistration, registerDevice);

/**
 * DELETE /v1/devices/:deviceId/registrations/:passTypeId/:serialNumber
 *
 * Unregister a device
 *
 * Called when user removes pass from Apple Wallet
 *
 * Authentication: Required (ApplePass token)
 */
appleWalletWebServiceRoutes
  .route('/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber')
  .delete(verifyAppleWalletAuthForRegistration, unregisterDevice);

/**
 * GET /v1/devices/:deviceId/registrations/:passTypeId
 *
 * Get serial numbers of passes that need updating
 *
 * Called periodically by Apple Wallet to check for updates
 * Query param: ?passesUpdatedSince=<ISO 8601 timestamp>
 *
 * Authentication: Not required (Apple's spec says this endpoint doesn't need auth)
 */
appleWalletWebServiceRoutes
  .route('/v1/devices/:deviceId/registrations/:passTypeId')
  .get(getUpdatedPasses);

/**
 * POST /v1/log
 *
 * Log errors from Apple Wallet
 *
 * Apple Wallet sends error logs here for debugging
 *
 * Authentication: Not required
 */
appleWalletWebServiceRoutes.route('/v1/log').post(logError);

/**
 * Health check endpoint (optional - for monitoring)
 * Not part of Apple's spec, but useful for debugging
 */
appleWalletWebServiceRoutes.route('/health').get((req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Apple Wallet Web Service',
    timestamp: new Date().toISOString(),
  });
});
