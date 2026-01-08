import { Employee } from '../models/employee.model.js';

/**
 * Authentication Middleware for Apple Wallet Web Service
 *
 * Validates the Authorization header sent by Apple Wallet:
 * Format: "ApplePass <authenticationToken>"
 *
 * According to Apple's specification:
 * https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes
 */

/**
 * Verify Apple Wallet authentication token
 * Used for GET /passes/:passTypeId/:serialNumber endpoint
 */
export const verifyAppleWalletAuth = async (req, res, next) => {
  try {
    const { serialNumber } = req.params;
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      console.log('❌ No Authorization header provided');
      return res.sendStatus(401);
    }

    // Validate header format: "ApplePass <token>"
    if (!authHeader.startsWith('ApplePass ')) {
      console.log('❌ Invalid Authorization header format. Expected: "ApplePass <token>"');
      return res.sendStatus(401);
    }

    // Extract the authentication token
    const authToken = authHeader.replace('ApplePass ', '').trim();

    if (!authToken) {
      console.log('❌ Empty authentication token');
      return res.sendStatus(401);
    }

    // Find employee by serial number and verify token
    const employee = await Employee.findOne({
      'wallet_passes.apple.serial_number': serialNumber,
      'wallet_passes.apple.authentication_token': authToken,
      'wallet_passes.apple.status': 'ACTIVE',
    });

    if (!employee) {
      console.log('❌ Invalid authentication token or inactive pass');
      console.log(`   Serial: ${serialNumber}`);
      console.log(`   Token: ${authToken.substring(0, 8)}...`);
      return res.sendStatus(401);
    }

    // Attach employee to request for use in controller
    req.employee = employee;
    req.authToken = authToken;

    console.log('✅ Authentication successful');
    console.log(`   Employee: ${employee.name} (${employee.employee_id})`);
    console.log(`   Serial: ${serialNumber}`);

    next();
  } catch (error) {
    console.error('❌ Error in Apple Wallet authentication:', error.message);
    return res.sendStatus(401);
  }
};

/**
 * Verify Apple Wallet authentication for device registration/unregistration
 * Used for POST/DELETE /devices/:deviceId/registrations/:passTypeId/:serialNumber
 */
export const verifyAppleWalletAuthForRegistration = async (req, res, next) => {
  try {
    const { serialNumber } = req.params;
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      console.log('❌ Registration: No Authorization header');
      return res.sendStatus(401);
    }

    // Validate header format
    if (!authHeader.startsWith('ApplePass ')) {
      console.log('❌ Registration: Invalid Authorization format');
      return res.sendStatus(401);
    }

    // Extract token
    const authToken = authHeader.replace('ApplePass ', '').trim();

    if (!authToken) {
      console.log('❌ Registration: Empty token');
      return res.sendStatus(401);
    }

    // Find employee by serial number and verify token
    const employee = await Employee.findOne({
      'wallet_passes.apple.serial_number': serialNumber,
      'wallet_passes.apple.authentication_token': authToken,
      'wallet_passes.apple.status': 'ACTIVE',
    });

    if (!employee) {
      console.log('❌ Registration: Invalid token or inactive pass');
      console.log(`   Serial: ${serialNumber}`);
      return res.sendStatus(401);
    }

    // Attach employee to request
    req.employee = employee;
    req.authToken = authToken;

    console.log('✅ Registration authentication successful');
    console.log(`   Employee: ${employee.name} (${employee.employee_id})`);

    next();
  } catch (error) {
    console.error('❌ Error in registration authentication:', error.message);
    return res.sendStatus(401);
  }
};

/**
 * Optional: Log request details for debugging
 * Can be removed in production if not needed
 */
export const logAppleWalletRequest = (req, res, next) => {
  console.log('\n📱 Apple Wallet Web Service Request:');
  console.log(`   Method: ${req.method}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Params:`, req.params);
  console.log(`   Query:`, req.query);
  console.log(`   Headers:`, {
    authorization: req.headers.authorization ? 'Present' : 'Missing',
    'user-agent': req.headers['user-agent'],
    'if-modified-since': req.headers['if-modified-since'],
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body:`, req.body);
  }
  console.log('');
  next();
};
