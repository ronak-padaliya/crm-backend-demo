import { RequestHandler } from 'express';
import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// Validation middleware to check for validation errors
const validateRequest: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// Login validation
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validateRequest
] as RequestHandler[];

// Add user validation
export const validateAddUser = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role').trim().isIn(['superAdmin', 'admin', 'supervisor', 'salesperson'])
    .withMessage('Invalid role specified'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('orgId').optional().isInt().withMessage('Organization ID must be an integer'),
  body('adminId').optional().isInt().withMessage('Admin ID must be an integer'),
  body('supervisorId').optional().isInt().withMessage('Supervisor ID must be an integer'),
];
// Password reset validation
export const validatePasswordReset = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isString().notEmpty().withMessage('OTP is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters and contain uppercase, lowercase, number and special character'),
];

export const validateSuperAdminRegister = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('registrationKey').trim().notEmpty().withMessage('Registration key is required'),
];
