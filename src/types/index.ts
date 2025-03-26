import { Request } from 'express';
import * as express from 'express';
import { File } from 'multer';
// import { UserPayload } from '../types'; // Adjust the path as necessary

declare global {
    namespace Express {
        interface Request {
            file?: File;
            files?: File[];
            // user?: {
            //     orgId: string; // Adjust the type as necessary
            // };
        }
    }
}

export type UserRole = 'superAdmin' | 'admin' | 'supervisor' | 'salesperson';

export interface UserPayload {
  id?: number;
  userId: number;
  role: UserRole;
  orgId?: number;
  orgName?: string;
  isSuperAdmin?: boolean;
  supervisorId?: number;
  email: string;
}

export interface AuthenticatedRequest<T = any> extends Request {
  user?: UserPayload;
  fetchAll?: boolean; 
  body: T;
  query: any;
  params: any;
  file?: File;
}

export interface RolePermissionRequestBody {
  roleName: string;
  moduleName: string;
  canRead: boolean;
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// Method to insert a role and its permissions
export function insertRolePermission(body: RolePermissionRequestBody) {
  const { roleName, moduleName, canRead, canWrite, canUpdate, canDelete } = body;
  // Logic to insert the role and permissions
  console.log(`Inserting role: ${roleName} with permissions for module: ${moduleName}`);
  // Add your database or business logic here
}

export interface RoleNameRequest extends AuthenticatedRequest<RolePermissionRequestBody> {
  params: {
    roleName: string;
  };
}

export interface QueryResult {
  rows: { id: number }[];
}
