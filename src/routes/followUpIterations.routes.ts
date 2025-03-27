import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { FollowUpIterationsController } from '../controllers/followUpIterations.controller.js';
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../types/index.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';

const router = Router();

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
};

router.post(
  '/',
  authenticateToken,
  checkRole(['admin']),
  body('iteration').isString().notEmpty(),
  body('days').isNumeric().notEmpty(),
  asyncHandler(FollowUpIterationsController.createFollowUpIteration)
);

// Get all follow-up iterations with pagination
router.get('/', authenticateToken, FollowUpIterationsController.getAllFollowUpIterations);

// Get follow-up iteration by ID
router.get('/:id', authenticateToken, FollowUpIterationsController.getFollowUpIterationById);

// Update follow-up iteration with validation
router.put(
  '/:id',
  authenticateToken,
  checkRole(['admin']),
  body('iteration').isString().optional(),
  body('days').isNumeric().optional(),
  asyncHandler(FollowUpIterationsController.updateFollowUpIteration)
);

// Delete follow-up iteration
router.delete('/:id', authenticateToken, checkRole(['admin']), asyncHandler(FollowUpIterationsController.deleteFollowUpIteration));

export default router;
