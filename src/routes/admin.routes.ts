import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../types';
import { validateAddUser } from '../utils/validators';
import { authenticateToken, checkRole, getAllDataForSuperAdmin, checkAllowedUsers } from '../middleware/auth';

const router = Router();

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as AuthenticatedRequest, res, next).catch(next);
  };
};

router.post(
  '/',
  authenticateToken,
  checkRole(['superAdmin']),
  validateAddUser,
  asyncHandler(AdminController.createAdmin)
);

// Get all admins with pagination
// router.get('/', authenticateToken, getAllDataForSuperAdmin, checkAllowedUsers(), asyncHandler(AdminController.getAllAdmins));

router.get(
  '/',
  authenticateToken,
  // getAllDataForSuperAdmin,
  // asyncHandler(checkAllowedUsers()),
  asyncHandler(AdminController.getAllAdmins)
);

// Get admin by ID
router.get('/:id', authenticateToken, getAllDataForSuperAdmin, asyncHandler(AdminController.getAdminById));

// Update admin with validation
router.put(
  '/:id',
  authenticateToken,
  getAllDataForSuperAdmin,
  // checkRole(['superAdmin']),
  body('firstName').isString().optional(),
  body('lastName').isString().optional(),
  body('phone').isString().optional(),
  asyncHandler(AdminController.updateAdmin)
);

// Delete admin
router.delete('/:id', authenticateToken, getAllDataForSuperAdmin, asyncHandler(AdminController.deleteAdmin));

// Get filtered admins with validation
router.post(
  '/filtered',
  authenticateToken,
  getAllDataForSuperAdmin,
  body('page').isNumeric().optional(),
  body('limit').isNumeric().optional(),
  body('search').optional().isString(),
  asyncHandler(AdminController.getFilteredAdmins)
);

export default router;
