import { Employee } from '../models/employee.model.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import fs from 'fs';

/**
 * Get pass (Apple Wallet checks for updates)
 */
export const getPass = asyncWrapper(async (req, res) => {
  const { serialNumber } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('ApplePass ')) {
    return res.sendStatus(401);
  }

  const token = authHeader.replace('ApplePass ', '');

  const employee = await Employee.findOne({
    'wallet_passes.apple.serial_number': serialNumber,
    'wallet_passes.apple.authentication_token': token,
    'wallet_passes.apple.status': 'ACTIVE',
  });

  if (!employee) return res.sendStatus(401);

  const filePath = employee.wallet_passes?.apple?.pass_file_path;

  if (!filePath || !fs.existsSync(filePath)) {
    return res.sendStatus(410);
  }

  const passBuffer = fs.readFileSync(filePath);
  res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
  res.send(passBuffer);
});

/**
 * Register device (Apple Wallet wants to register)
 * We acknowledge but don't store anything
 */
export const registerDevice = asyncWrapper(async (req, res) => {
  // Just acknowledge - no storage needed for basic functionality
  res.sendStatus(201);
});

/**
 * Unregister device
 */
export const unregisterDevice = asyncWrapper(async (req, res) => {
  res.sendStatus(200);
});

/**
 * Get updated passes (no updates for basic implementation)
 */
export const getUpdatedPasses = asyncWrapper(async (req, res) => {
  res.json({
    lastUpdated: new Date().toISOString(),
    serialNumbers: [],
  });
});

/**
 * Log errors (optional)
 */
export const logError = asyncWrapper(async (req, res) => {
  console.log('Wallet error:', req.body);
  res.sendStatus(200);
});
