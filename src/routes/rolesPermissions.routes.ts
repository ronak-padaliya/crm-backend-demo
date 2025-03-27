import { Router } from 'express';
import { body, param } from 'express-validator';
import { RolesPermissionsController } from '../controllers/rolesPermissions.controller.js';
import { checkRole } from '../middleware/auth.js';

const router = Router();

// Get permissions by role
router.get(
  '/user/:userId',
  // checkRole(['superAdmin']),
  param('userId').isString().notEmpty(),
  RolesPermissionsController.getPermissionsByRole
);

// Assign role permissions
router.post(
  '/assign',
  [
    body('userId').isInt().notEmpty(),
    body('moduleId').isInt().notEmpty(),
    body('permissionIds').isArray().notEmpty()
      .custom((value) => value.every((id: any) => Number.isInteger(id))),
  ],
  RolesPermissionsController.assignRolePermissions
);

// Remove role permissions
router.delete(
  '/:userId/:moduleId',
  [
    param('userId').isInt().notEmpty(),
    param('moduleId').isInt().notEmpty(),
  ],
  RolesPermissionsController.removeRolePermissions
);

// Update role permissions
router.put(
  '/:userId/:moduleId',
  [
    param('userId').isInt().notEmpty(),
    param('moduleId').isInt().notEmpty(),
    body('permissionIds').isArray().notEmpty()
      .custom((value) => value.every((id: any) => Number.isInteger(id))),
  ],
  RolesPermissionsController.updateRolePermissions
);

export default router;