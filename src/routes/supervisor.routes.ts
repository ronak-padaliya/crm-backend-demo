import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { SupervisorController } from '../controllers/supervisor.controller.js';
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../types/index.js';
import { authenticateToken, checkRole, getAllDataForSuperAdmin } from '../middleware/auth.js';
import { validateAddUser } from '../utils/validators.js';


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
  asyncHandler(SupervisorController.createSupervisor)
);

// Get all supervisors with pagination
router.get('/', authenticateToken, getAllDataForSuperAdmin, asyncHandler(SupervisorController.getAllSupervisors));

// Get supervisor by ID
router.get('/:id', authenticateToken, getAllDataForSuperAdmin, asyncHandler(SupervisorController.getSupervisorById));

// Update supervisor with validation
router.put(
  '/:id',
  authenticateToken,
  getAllDataForSuperAdmin, 
  body('firstName').isString().optional(),
  body('lastName').isString().optional(),
  body('phone').isString().optional(),
  asyncHandler(SupervisorController.updateSupervisor)
);

// Delete supervisor
router.delete('/:id',authenticateToken, getAllDataForSuperAdmin, asyncHandler( SupervisorController.deleteSupervisor));

// Get filtered supervisors with validation
router.post(
  '/filtered',
  authenticateToken,
  getAllDataForSuperAdmin,
  body('page').isNumeric().optional(),
  body('limit').isNumeric().optional(),
  body('search').optional().isString(),
  asyncHandler(SupervisorController.getFilteredSupervisors)
);

export default router;
