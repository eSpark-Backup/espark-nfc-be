import { body } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Validator helper to check if value is valid MongoDB ObjectId or employee_id format
 */
const isValidEmployeeIdentifier = (value) => {
  return mongoose.Types.ObjectId.isValid(value) || /^ES\d+$/i.test(value);
};

/**
 * Validate bulk generate request
 * POST /api/employees/wallet/google/bulk-generate
 */
export const validateBulkGenerate = [
  body('employee_ids')
    .exists()
    .withMessage('employee_ids is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('employee_ids must be a non-empty array')
    .bail()
    .custom((value) => {
      if (value.length > 100) {
        throw new Error('Maximum 100 employees can be processed at once');
      }
      return true;
    })
    .bail()
    .custom((value) => {
      const allValid = value.every((id) => isValidEmployeeIdentifier(id));
      if (!allValid) {
        throw new Error(
          'All employee_ids must be valid MongoDB ObjectIds or employee_id format (e.g., ES01)'
        );
      }
      return true;
    })
    .bail()
    .custom((value) => {
      const uniqueIds = new Set(value);
      if (uniqueIds.size !== value.length) {
        throw new Error('Duplicate employee_ids found. Each employee_id must be unique');
      }
      return true;
    }),
];

/**
 * Validate pass update request (if any additional fields are needed in the future)
 * PATCH /api/employees/:id/wallet/google/update
 */
export const validatePassUpdate = [
  body('force_update')
    .optional()
    .isBoolean()
    .withMessage('force_update must be a boolean value')
    .toBoolean(),

  body('update_reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('update_reason must not exceed 200 characters'),
];

/**
 * Validate deactivation request (if any additional fields are needed in the future)
 * DELETE /api/employees/:id/wallet/google/deactivate
 */
export const validatePassDeactivation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('deactivation reason must not exceed 200 characters'),

  body('notify_employee')
    .optional()
    .isBoolean()
    .withMessage('notify_employee must be a boolean value')
    .toBoolean(),
];

/**
 * Validate batch deactivation request
 * POST /api/employees/wallet/google/bulk-deactivate
 */
export const validateBulkDeactivate = [
  body('employee_ids')
    .exists()
    .withMessage('employee_ids is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('employee_ids must be a non-empty array')
    .bail()
    .custom((value) => {
      if (value.length > 50) {
        throw new Error('Maximum 50 employees can be deactivated at once');
      }
      return true;
    })
    .bail()
    .custom((value) => {
      const allValid = value.every((id) => isValidEmployeeIdentifier(id));
      if (!allValid) {
        throw new Error(
          'All employee_ids must be valid MongoDB ObjectIds or employee_id format (e.g., ES01)'
        );
      }
      return true;
    })
    .bail()
    .custom((value) => {
      const uniqueIds = new Set(value);
      if (uniqueIds.size !== value.length) {
        throw new Error('Duplicate employee_ids found. Each employee_id must be unique');
      }
      return true;
    }),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('deactivation reason must not exceed 200 characters'),
];

/**
 * Validate pass status query parameters
 * GET /api/employees/:id/wallet/google/status
 */
export const validateStatusQuery = [
  // Currently no query params, but can add in future
  // For example: ?include_history=true, ?detailed=true
];

/**
 * Validate wallet pass filters for listing
 * GET /api/employees/wallet/google/all
 */
export const validateWalletListQuery = [
  // Query params validation can be added here if needed
  // For example: ?status=ACTIVE, ?department_id=xxx, ?date_from=xxx
];

/**
 * Custom sanitizer to ensure employee_ids are strings
 */
export const sanitizeEmployeeIds = [
  body('employee_ids.*')
    .trim()
    .customSanitizer((value) => {
      // Convert to string if it's not already
      return String(value);
    }),
];

/**
 * Validate pass generation options (for advanced features)
 */
export const validatePassGenerationOptions = [
  body('options.auto_update')
    .optional()
    .isBoolean()
    .withMessage('auto_update must be a boolean value')
    .toBoolean(),

  body('options.expiry_days')
    .optional()
    .isInt({ min: 1, max: 3650 })
    .withMessage('expiry_days must be between 1 and 3650 (10 years)'),

  body('options.background_color')
    .optional()
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('background_color must be a valid hex color (e.g., #1a73e8)'),

  body('options.custom_message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('custom_message must not exceed 500 characters'),
];
