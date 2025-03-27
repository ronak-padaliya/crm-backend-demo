import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller.js';
import { RequestHandler } from 'express';
import { body } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { checkRole } from '../middleware/auth.js';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const organizationController = new OrganizationController();

const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
};


// Get all organizations
router.get('/', 
  authenticateToken as RequestHandler,
  checkRole(['superAdmin']),
  organizationController.getAllOrganizations as RequestHandler
);

// Get organization by ID
router.get('/:id', 
  authenticateToken as RequestHandler,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response = await organizationController.getOrganizationById(req as AuthenticatedRequest, res);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.put('/:id', 
  authenticateToken as RequestHandler,
  checkRole(['superAdmin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await organizationController.updateOrganization(req as AuthenticatedRequest, res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Delete organization - only superAdmin can delete
router.delete('/:id', 
  authenticateToken as RequestHandler,
  checkRole(['superAdmin']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await organizationController.deleteOrganization(req as AuthenticatedRequest, res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/filtered',
  authenticateToken,
  body('page').isNumeric().optional(),
  body('limit').isNumeric().optional(),
  body('search').optional().isString(),
  asyncHandler(OrganizationController.getFilteredOrganizations)
);

export default router;
