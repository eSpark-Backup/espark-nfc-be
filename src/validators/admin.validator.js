import { body, param } from 'express-validator';

export const validateCreateAdmin = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name can be up to 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address'),

  body('phone_number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/\d/)
    .withMessage('Password must contain a number')
    .matches(/[\W_]/)
    .withMessage('Password must contain a special character'),

  // Note: Profile image is optional and validated via multer/s3 middleware
];

export const validateUpdateAdmin = [
  param('id').isMongoId().withMessage('Invalid admin ID'),

  // Ensure at least one field is present
  (req, res, next) => {
    const updatableFields = ['full_name', 'email', 'phone_number'];
    const hasValidField = updatableFields.some((field) => field in req.body);

    if (!hasValidField && !req.file) {
      return res.status(400).json({
        success: false,
        message:
          'At least one field (full_name, email, or phone_number) or profile image must be provided to update',
      });
    }

    next();
  },

  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Full name can be up to 100 characters'),

  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Invalid email address'),

  body('phone_number')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
];

export const validateAdminId = [param('id').isMongoId().withMessage('Invalid admin ID')];
