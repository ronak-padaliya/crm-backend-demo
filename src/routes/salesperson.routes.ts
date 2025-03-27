import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { SalespersonController } from '../controllers/salesperson.controller.js';
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../types/index.js';
import { validateAddUser } from '../utils/validators.js';
import { authenticateToken, checkRole, getAllDataForSuperAdmin } from '../middleware/auth.js';

const router = Router();

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
};

router.post(
  '/',
  authenticateToken,
  checkRole(['superAdmin']),
  validateAddUser,
  asyncHandler(SalespersonController.createSalesperson)
);

// Get all salespersons with pagination
router.get('/', authenticateToken, getAllDataForSuperAdmin, asyncHandler(SalespersonController.getAllSalespersons));

// Get salesperson by ID
router.get('/:id', authenticateToken, getAllDataForSuperAdmin, asyncHandler(SalespersonController.getSalespersonById));

// Update salesperson with validation
router.put(
  '/:id',
  authenticateToken,
  getAllDataForSuperAdmin,
  body('firstName').isString().optional(),
  body('lastName').isString().optional(),
  body('phone').isString().optional(),
  asyncHandler(SalespersonController.updateSalesperson)
);

// Delete salesperson
router.delete('/:id', authenticateToken, getAllDataForSuperAdmin, asyncHandler(SalespersonController.deleteSalesperson));

// Get filtered salespersons with validation
router.post(
  '/filtered',
  authenticateToken,
  getAllDataForSuperAdmin,
  body('page').isNumeric().optional(),
  body('limit').isNumeric().optional(),
  body('search').optional().isString(),
  asyncHandler(SalespersonController.getFilteredSalespersons)
);

export default router;
