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
 * POST /api/employees/wallet/apple/bulk-generate
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
 * PATCH /api/employees/:id/wallet/apple/update
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
 * DELETE /api/employees/:id/wallet/apple/deactivate
 */
export const validatePassDeactivation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('deactivation reason must not exceed 200 characters'),

  body('delete_file')
    .optional()
    .isBoolean()
    .withMessage('delete_file must be a boolean value')
    .toBoolean(),

  body('notify_employee')
    .optional()
    .isBoolean()
    .withMessage('notify_employee must be a boolean value')
    .toBoolean(),
];

/**
 * Validate batch deactivation request
 * POST /api/employees/wallet/apple/bulk-deactivate
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

  body('delete_files')
    .optional()
    .isBoolean()
    .withMessage('delete_files must be a boolean value')
    .toBoolean(),
];

/**
 * Validate cleanup request
 * POST /api/employees/wallet/apple/cleanup
 */
export const validateCleanupRequest = [
  body('max_age_hours')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('max_age_hours must be between 1 and 168 (1 week)')
    .toInt(),

  body('dry_run').optional().isBoolean().withMessage('dry_run must be a boolean value').toBoolean(),
];

/**
 * Validate pass status query parameters
 * GET /api/employees/:id/wallet/apple/status
 */
export const validateStatusQuery = [
  // Currently no query params, but can add in future
  // For example: ?include_file_info=true, ?detailed=true
];

/**
 * Validate wallet pass filters for listing
 * GET /api/employees/wallet/apple/all
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
  body('options.expiry_days')
    .optional()
    .isInt({ min: 1, max: 3650 })
    .withMessage('expiry_days must be between 1 and 3650 (10 years)'),

  body('options.background_color')
    .optional()
    .trim()
    .matches(/^rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)$/)
    .withMessage('background_color must be a valid RGB color (e.g., rgb(26, 115, 232))'),

  body('options.foreground_color')
    .optional()
    .trim()
    .matches(/^rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)$/)
    .withMessage('foreground_color must be a valid RGB color (e.g., rgb(255, 255, 255))'),

  body('options.label_color')
    .optional()
    .trim()
    .matches(/^rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)$/)
    .withMessage('label_color must be a valid RGB color (e.g., rgb(255, 255, 255))'),

  body('options.include_strip_image')
    .optional()
    .isBoolean()
    .withMessage('include_strip_image must be a boolean value')
    .toBoolean(),

  body('options.include_thumbnail')
    .optional()
    .isBoolean()
    .withMessage('include_thumbnail must be a boolean value')
    .toBoolean(),

  body('options.custom_organization_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('custom_organization_name must not exceed 100 characters'),

  body('options.custom_description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('custom_description must not exceed 200 characters'),
];

/**
 * Validate download options
 * GET /api/employees/:id/wallet/apple/download
 */
export const validateDownloadOptions = [
  // Query params for download customization
  // For example: ?inline=true, ?format=base64
];

/**
 * Validate file management operations
 */
export const validateFileOperation = [
  body('operation')
    .exists()
    .withMessage('operation is required')
    .isIn(['delete', 'archive', 'restore'])
    .withMessage('operation must be one of: delete, archive, restore'),

  body('file_path')
    .exists()
    .withMessage('file_path is required')
    .trim()
    .notEmpty()
    .withMessage('file_path cannot be empty')
    .matches(/\.pkpass$/)
    .withMessage('file_path must end with .pkpass extension'),
];

/**
 * Validate statistics query parameters
 * GET /api/employees/wallet/statistics
 */
export const validateStatisticsQuery = [
  // Query params for filtering statistics
  // For example: ?department_id=xxx, ?date_from=xxx, ?date_to=xxx
];
