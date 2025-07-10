import { body, param } from 'express-validator';

// ===== CREATE =====
export const validateCreateDepartment = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Department name is required')
    .isLength({ max: 100 })
    .withMessage('Name can be up to 100 characters')
    .matches(/[a-zA-Z]/)
    .withMessage('Department name must include at least one alphabet character'),

  body('email')
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address'),
];

// ===== UPDATE =====
export const validateUpdateDepartment = [
  param('id').isMongoId().withMessage('Invalid department ID'),

  // Custom check: at least one field must be provided
  (req, res, next) => {
    const updatableFields = ['name', 'email'];
    const hasValidField = updatableFields.some((field) => field in req.body);
    if (!hasValidField) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (name or email) must be provided to update',
      });
    }
    next();
  },

  body('name')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Department name is required')
    .isLength({ max: 100 })
    .withMessage('Name can be up to 100 characters')
    .matches(/[a-zA-Z]/)
    .withMessage('Department name must include at least one alphabet character'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email address'),
];

// ===== PARAM ID VALIDATION =====
export const validateDepartmentId = [param('id').isMongoId().withMessage('Invalid department ID')];
