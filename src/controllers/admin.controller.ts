import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { adminQueries } from '../query.js';
import { body, validationResult } from 'express-validator';
import { MailService } from '../services/mail.service.js';
import { successResponse, errorResponse, ResponseMessages } from '../utils/responses.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AdminController {

  static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, firstName, lastName, phone, orgName } = req.body;
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
  
      // Check if email exists
      const existingUser = await adminQueries.checkExistingEmail(email);
      if (existingUser.rows.length > 0) {
        return res.status(400).json(errorResponse(ResponseMessages.ADMIN.EMAIL_EXISTS));      }
  
      // Insert user without role
      const userResult = await adminQueries.insertAdmin(
        email, 
        hashedPassword, 
        firstName, 
        lastName, 
        phone, 
        orgName
      );
  
      // Send email with temporary password
      try {
        await MailService.sendPasswordMail(email, tempPassword, 'admin');
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
  
      return res.status(201).json(successResponse(ResponseMessages.ADMIN.CREATED, {
        tempPassword: tempPassword
      }));
    } catch (error) {
      console.error('Add user error:', error);
      return res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async getAllAdmins(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = req.user.isSuperAdmin
        ? await adminQueries.getAllAdmins(Number(page), Number(limit))
        : await adminQueries.getAllAdmins(Number(page), Number(limit), req.user.orgId);

      const data = result.rows;
      const totalCount = data.length > 0 ? Number(data[0].total_count) : 0;

      res.status(200).json(successResponse(ResponseMessages.SERVER.SUCCESS, { data, totalCount }));
    } catch (error) {
      console.error('Error fetching admins:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.SERVER_ERROR));
    }
}



  static async getAdminById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!req.user) {
        res.status(401).json(errorResponse(ResponseMessages.AUTH.UNAUTHORIZED));
        return;
      }
      
      const result = req.user.isSuperAdmin
        ? await adminQueries.getAdminById(Number(id))
        : await adminQueries.getAdminById(Number(id), req.user.orgId);
      
      if (result.rows.length === 0) {
        res.status(404).json(errorResponse(ResponseMessages.ADMIN.NOT_FOUND));
        return;
      }
      res.status(200).json(successResponse(ResponseMessages.ADMIN.FOUND, result.rows[0]));
    } catch (error) {
      console.error('Error fetching admin:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async updateAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const {firstName, lastName, phone } = req.body;
    const orgId = req.user.orgId;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse(ResponseMessages.VALIDATION.FAILED, errors.array()));
      return;
    }

    try {
      // Fetch the existing admin record
      const existingAdminResult = await adminQueries.getAdminById(Number(id), Number(orgId));
      if (existingAdminResult.rows.length === 0) {
        res.status(404).json(errorResponse(ResponseMessages.ADMIN.NOT_FOUND));
        return;
      }

      const existingAdmin = existingAdminResult.rows[0];

      // Prepare the updated values, retaining existing values if not provided
      const updatedFirstName = firstName !== undefined ? firstName : existingAdmin.first_name;
      const updatedLastName = lastName !== undefined ? lastName : existingAdmin.last_name;
      const updatedPhone = phone !== undefined ? phone : existingAdmin.phone;

      // Update the admin with the new values
      const result = req.user.isSuperAdmin
        ? await adminQueries.updateAdmin(Number(id),  updatedFirstName, updatedLastName, updatedPhone)
        : await adminQueries.updateAdmin(Number(id),  updatedFirstName, updatedLastName, updatedPhone, orgId);
      res.status(200).json(successResponse(ResponseMessages.ADMIN.UPDATED, result.rows[0]));
    } catch (error) {
      console.error('Error updating admin:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async deleteAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const orgId = req.user.orgId;
    try {
      const result = req.user.isSuperAdmin
        ? await adminQueries.deleteAdmin(Number(id))
        : await adminQueries.deleteAdmin(Number(id), Number(orgId));
      if (result.rowCount === 0) {
        res.status(404).json(errorResponse(ResponseMessages.ADMIN.NOT_FOUND));
        return;
      }
      res.status(200).json(successResponse(ResponseMessages.ADMIN.DELETED));
      return;
    } catch (error) {
      console.error('Error deleting admin:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
      return;
    }
  }


//   static async getFilteredAdmins(req: AuthenticatedRequest, res: Response): Promise<void> {
//     try {
//         const { page = 1, limit = 20, search = "" } = req.body;
//         const orgId = req.user.isSuperAdmin ? undefined : req.user.orgId;

//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             res.status(400).json(errorResponse(ResponseMessages.VALIDATION.FAILED, errors.array()));
//             return;
//         }

//         const trimmedSearch = search.trim();

//         const result = await adminQueries.getFilteredAdmins(
//             Number(page),
//             Number(limit),
//             orgId,
//             trimmedSearch
//         );

//         if (result.rows.length === 0) {
//             res.status(404).json(errorResponse(ResponseMessages.ADMIN.NOT_FOUND));
//             return;
//         }

//         res.status(200).json(successResponse(ResponseMessages.ADMIN.FOUND, result.rows));
//     } catch (error) {
//         console.error("Error fetching filtered admins:", error);
//         res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
//     }
// }

static async getFilteredAdmins(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
      const { page = 1, limit = 20, search = "" } = req.body;
      const orgId = req.user.isSuperAdmin ? undefined : req.user.orgId;

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
          res.status(400).json(errorResponse(ResponseMessages.VALIDATION.FAILED, errors.array()));
          return;
      }

      const trimmedSearch = search.trim();
      const result = await adminQueries.getFilteredAdmins(Number(page), Number(limit), orgId, trimmedSearch);

      if (result.rows.length === 0) {
          res.status(404).json(errorResponse(ResponseMessages.ADMIN.NOT_FOUND));
          return;
      }

      const data = result.rows;
      const totalCount = data.length > 0 ? Number(data[0].total_count) : 0;

      res.status(200).json(successResponse(ResponseMessages.ADMIN.FOUND, { data, totalCount }));
  } catch (error) {
      console.error("Error fetching filtered admins:", error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
  }
}


  
}