import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { rolesPermissionsQueries } from '../query';

export class RolesPermissionsController {
  static async getPermissionsByRole(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    try {
      const result = await rolesPermissionsQueries.getPermissionsByRole(userId);
      if (result.rows.length === 0) {
        res.status(404).json({ message: 'No permissions found for this user' });
        return;
      }
      // For the second query format, you might want to send just the permission_details
      res.json(result.rows[0].permission_details || result.rows[0]);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async assignRolePermissions(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { userId, moduleId, permissionIds } = req.body;

    try {
      const result = await rolesPermissionsQueries.assignRolePermissions(
        userId,
        moduleId,
        permissionIds
      );
      res.json(result.rows[0]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Read permission is mandatory for access.') {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error('Error assigning permissions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async removeRolePermissions(req: Request, res: Response): Promise<void> {
    const { userId, moduleId } = req.params;
    try {
      const result = await rolesPermissionsQueries.removeRolePermissions(
        Number(userId),
        Number(moduleId)
      );
      if (result.rowCount === 0) {
        res.status(404).json({ message: 'No permissions found to remove' });
        return;
      }
      res.json({ message: 'Permissions removed successfully' });
    } catch (error) {
      console.error('Error removing permissions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateRolePermissions(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
  
    const { userId, moduleId } = req.params;
    const { permissionIds } = req.body;
  
    try {
      // Validate that read permission (1) is included
      if (!permissionIds.includes(1)) {
        res.status(400).json({ message: "Read permission (1) is mandatory and cannot be removed" });
        return;
      }
  
      const result = await rolesPermissionsQueries.updateRolePermissions(
        Number(userId),
        Number(moduleId),
        permissionIds
      );
  
      if (result.rowCount === 0) {
        res.status(404).json({ message: 'No permissions found for this user and module' });
        return;
      }
  
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating permissions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

}