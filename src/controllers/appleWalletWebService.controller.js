import { Employee } from '../models/employee.model.js';
import { DeviceRegistration } from '../models/deviceRegistration.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import fs from 'fs';

/**
 * Apple Wallet Web Service Controllers
 *
 * Implements Apple's PassKit Web Service specification:
 * https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes
 *
 * These endpoints are called by Apple Wallet on iOS devices
 */

/**
 * GET /v1/passes/:passTypeId/:serialNumber
 *
 * Get the latest version of a pass
 *
 * Apple Wallet calls this to:
 * 1. Download the pass when user taps "Add to Apple Wallet"
 * 2. Check for pass updates
 *
 * Request Headers:
 * - Authorization: ApplePass <authenticationToken>
 * - If-Modified-Since: (optional) RFC 2822 date
 *
 * Response:
 * - 200: Return the pass (.pkpass file)
 * - 304: Pass not modified (if If-Modified-Since header present)
 * - 401: Invalid authentication
 * - 404: Pass not found
 */
export const getPass = asyncWrapper(async (req, res) => {
  const { passTypeId, serialNumber } = req.params;
  const employee = req.employee; // Attached by authentication middleware

  console.log('\n📥 GET Pass Request');
  console.log(`   Pass Type: ${passTypeId}`);
  console.log(`   Serial: ${serialNumber}`);
  console.log(`   Employee: ${employee.name} (${employee.employee_id})`);

  // Get pass file path
  const passFilePath = employee.wallet_passes?.apple?.pass_file_path;

  if (!passFilePath || !fs.existsSync(passFilePath)) {
    console.log('❌ Pass file not found on server');
    return res.sendStatus(404);
  }

  // Check If-Modified-Since header (optional optimization)
  const ifModifiedSince = req.headers['if-modified-since'];
  if (ifModifiedSince) {
    const lastModified = employee.wallet_passes?.apple?.last_updated || new Date(0);
    const ifModifiedSinceDate = new Date(ifModifiedSince);

    if (lastModified <= ifModifiedSinceDate) {
      console.log('✅ Pass not modified - returning 304');
      return res.sendStatus(304);
    }
  }

  // Read and send the pass file
  const passBuffer = fs.readFileSync(passFilePath);
  const lastModified = employee.wallet_passes?.apple?.last_updated || new Date();

  console.log('✅ Sending pass file');
  console.log(`   Size: ${(passBuffer.length / 1024).toFixed(2)} KB`);

  // Set proper headers for Apple Wallet
  res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
  res.setHeader('Last-Modified', lastModified.toUTCString());
  res.setHeader('Cache-Control', 'no-cache');

  res.status(200).send(passBuffer);
});

/**
 * POST /v1/devices/:deviceId/registrations/:passTypeId/:serialNumber
 *
 * Register a device to receive push notifications for a pass
 *
 * Called when user adds pass to Apple Wallet
 *
 * Request Headers:
 * - Authorization: ApplePass <authenticationToken>
 *
 * Request Body:
 * {
 *   "pushToken": "<push notification token>"
 * }
 *
 * Response:
 * - 201: Registration successful (new registration)
 * - 200: Already registered (existing registration updated)
 * - 401: Invalid authentication
 */
export const registerDevice = asyncWrapper(async (req, res) => {
  const { deviceId, passTypeId, serialNumber } = req.params;
  const { pushToken } = req.body;
  const employee = req.employee; // Attached by authentication middleware

  console.log('\n📱 Device Registration Request');
  console.log(`   Device ID: ${deviceId}`);
  console.log(`   Pass Type: ${passTypeId}`);
  console.log(`   Serial: ${serialNumber}`);
  console.log(`   Employee: ${employee.name} (${employee.employee_id})`);
  console.log(`   Push Token: ${pushToken ? pushToken.substring(0, 20) + '...' : 'Not provided'}`);

  if (!pushToken) {
    console.log('⚠️  No push token provided (this is optional)');
  }

  // Extract device metadata
  const metadata = {
    user_agent: req.headers['user-agent'] || 'unknown',
    ip_address: req.ip || req.connection.remoteAddress,
    registration_source: 'ios', // Assume iOS since it's Apple Wallet
  };

  try {
    // Register the device
    const result = await DeviceRegistration.registerDevice({
      deviceLibraryIdentifier: deviceId,
      pushToken: pushToken || 'no-token-provided',
      passTypeIdentifier: passTypeId,
      serialNumber: serialNumber,
      employeeId: employee._id,
      metadata: metadata,
    });

    if (result.status === 'created') {
      console.log('✅ Device registered successfully (new registration)');
      return res.sendStatus(201);
    } else if (result.status === 'updated') {
      console.log('✅ Device registration updated');
      return res.sendStatus(200);
    } else {
      console.log('✅ Device already registered');
      return res.sendStatus(200);
    }
  } catch (error) {
    console.error('❌ Error registering device:', error.message);
    return res.sendStatus(500);
  }
});

/**
 * DELETE /v1/devices/:deviceId/registrations/:passTypeId/:serialNumber
 *
 * Unregister a device
 *
 * Called when user removes pass from Apple Wallet
 *
 * Request Headers:
 * - Authorization: ApplePass <authenticationToken>
 *
 * Response:
 * - 200: Unregistration successful
 * - 401: Invalid authentication
 */
export const unregisterDevice = asyncWrapper(async (req, res) => {
  const { deviceId, passTypeId, serialNumber } = req.params;
  const employee = req.employee; // Attached by authentication middleware

  console.log('\n📱 Device Unregistration Request');
  console.log(`   Device ID: ${deviceId}`);
  console.log(`   Pass Type: ${passTypeId}`);
  console.log(`   Serial: ${serialNumber}`);
  console.log(`   Employee: ${employee.name} (${employee.employee_id})`);

  try {
    const unregistered = await DeviceRegistration.unregisterDevice(
      deviceId,
      passTypeId,
      serialNumber
    );

    if (unregistered) {
      console.log('✅ Device unregistered successfully');
    } else {
      console.log('⚠️  Device was not registered (nothing to unregister)');
    }

    // Always return 200, even if device wasn't registered
    return res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error unregistering device:', error.message);
    return res.sendStatus(500);
  }
});

/**
 * GET /v1/devices/:deviceId/registrations/:passTypeId?passesUpdatedSince=<timestamp>
 *
 * Get serial numbers of passes that have been updated
 *
 * Called periodically by Apple Wallet to check for updates
 *
 * Query Parameters:
 * - passesUpdatedSince: (optional) ISO 8601 timestamp or W3C datetime
 *
 * Response:
 * - 200: List of updated pass serial numbers
 * - 204: No updated passes
 *
 * Response Body (200):
 * {
 *   "lastUpdated": "2024-01-08T12:00:00Z",
 *   "serialNumbers": ["serial1", "serial2", ...]
 * }
 */
export const getUpdatedPasses = asyncWrapper(async (req, res) => {
  const { deviceId, passTypeId } = req.params;
  const { passesUpdatedSince } = req.query;

  console.log('\n🔄 Get Updated Passes Request');
  console.log(`   Device ID: ${deviceId}`);
  console.log(`   Pass Type: ${passTypeId}`);
  console.log(`   Updated Since: ${passesUpdatedSince || 'All passes'}`);

  try {
    // Get serial numbers of passes registered to this device
    const serialNumbers = await DeviceRegistration.getUpdatedSerialNumbers(
      deviceId,
      passTypeId,
      passesUpdatedSince || null
    );

    if (serialNumbers.length === 0) {
      console.log('✅ No updated passes');
      return res.sendStatus(204); // No Content
    }

    console.log(`✅ Found ${serialNumbers.length} updated pass(es)`);
    console.log(`   Serials: ${serialNumbers.join(', ')}`);

    // Return list of serial numbers
    return res.status(200).json({
      lastUpdated: new Date().toISOString(),
      serialNumbers: serialNumbers,
    });
  } catch (error) {
    console.error('❌ Error getting updated passes:', error.message);
    return res.sendStatus(500);
  }
});

/**
 * POST /v1/log
 *
 * Log errors from Apple Wallet
 *
 * Apple Wallet sends error logs here
 *
 * Request Body:
 * {
 *   "logs": ["error message 1", "error message 2", ...]
 * }
 *
 * Response:
 * - 200: Logs received
 */
export const logError = asyncWrapper(async (req, res) => {
  const { logs } = req.body;

  console.log('\n⚠️  Apple Wallet Error Logs:');
  if (Array.isArray(logs)) {
    logs.forEach((log, index) => {
      console.log(`   [${index + 1}] ${log}`);
    });
  } else {
    console.log('   ', logs);
  }

  // You can store these logs in database if needed
  // For now, just console.log them

  return res.sendStatus(200);
});
