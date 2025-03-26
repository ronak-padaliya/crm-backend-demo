import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { successResponse, errorResponse, ResponseMessages } from '../utils/responses';
import { MailService } from '../services/mail.service';
import { supervisorQueries } from '../query';
import { AuthenticatedRequest } from '../types';
import jwt from 'jsonwebtoken';


export class SupervisorController {

  static async createSupervisor(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, firstName, lastName, phone, orgId, adminId } = req.body;
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
  
      // Check if email exists
      const existingUser = await supervisorQueries.checkExistingEmail(email);
      if (existingUser.rows.length > 0) {
        return res.status(400).json(errorResponse(ResponseMessages.SUPERVISOR.EMAIL_EXISTS));
      }
  
      // Insert user
      const userResult = await supervisorQueries.insertSupervisor(
        email, 
        hashedPassword, 
        firstName, 
        lastName, 
        phone, 
        orgId, 
        adminId
      );
  
      // Send email with temporary password
      try {
        await MailService.sendPasswordMail(email, tempPassword, 'supervisor');
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
  
      return res.status(201).json(successResponse(ResponseMessages.SUPERVISOR.CREATED, {
        tempPassword: tempPassword
      }));
    } catch (error) {
      console.error('Add user error:', error);
      return res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }
  static async getAllSupervisors(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { page = 1, limit = 10 } = req.query;
    const orgId = req.user.orgId; // Extract orgId from the authenticated user
    const isSuperAdmin = req.user.role === 'superAdmin'; // Check if the user is a superAdmin

    try {
        const result = await supervisorQueries.getAllSupervisors(Number(page), Number(limit), orgId);
         res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.FOUND, result.rows));
         return;
    } catch (error) {
        console.error('Error fetching supervisors:', error);
         res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
         return;
    }
}

  static async getSupervisorById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const result = await supervisorQueries.getSupervisorById(id);
      if (result.rows.length === 0) {
         res.status(404).json(errorResponse(ResponseMessages.SUPERVISOR.NOT_FOUND));
         return;
      }
       res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.FOUND, result.rows[0]));
       return;
    } catch (error) {
      console.error('Error fetching supervisor:', error);
       res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
       return;
    }
  }

  static async updateSupervisor(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { firstName, lastName, phone } = req.body;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400).json(errorResponse(ResponseMessages.VALIDATION.FAILED, errors.array()));
       return;
    }

    try {
      // Fetch the existing supervisor record
      const existingSupervisorResult = await supervisorQueries.getSupervisorById(id);
      if (existingSupervisorResult.rows.length === 0) {
         res.status(404).json(errorResponse(ResponseMessages.SUPERVISOR.NOT_FOUND));
         return;
      }

      const existingSupervisor = existingSupervisorResult.rows[0];

      const updatedFirstName = firstName !== undefined ? firstName : existingSupervisor.first_name;
      const updatedLastName = lastName !== undefined ? lastName : existingSupervisor.last_name;
      const updatedPhone = phone !== undefined ? phone : existingSupervisor.phone;

      // Update the supervisor with the new values
      const result = await supervisorQueries.updateSupervisor(id, updatedFirstName, updatedLastName, updatedPhone);
       res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.UPDATED, result.rows[0]));
       return;
    } catch (error) {
      console.error('Error updating supervisor:', error);
       res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
       return;
    }
  }


  static async deleteSupervisor(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const result = await supervisorQueries.deleteSupervisor(id);
      if (result.rowCount === 0) {
         res.status(404).json(errorResponse(ResponseMessages.SUPERVISOR.NOT_FOUND));
         return;
      }
       res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.DELETED));
       return;
    } catch (error) {
      console.error('Error deleting supervisor:', error);
       res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
       return;
    }
  }

  // static async getFilteredSupervisors(req: AuthenticatedRequest, res: Response): Promise<void> {
  //   try {
  //     const { page = 1, limit = 20, email, firstName, lastName, phone } = req.body;
  //     const orgId = req.user.isSuperAdmin ? undefined : req.user.orgId;
  
  //     // Validate request
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //        res.status(400).json(errorResponse(ResponseMessages.VALIDATION.FAILED, errors.array()));
  //        return;
  //     }
  
  //     // Trim and normalize input values
  //     const finalEmail = email?.trim() || null;
  //     const finalFirstName = firstName?.trim() || null;
  //     const finalLastName = lastName?.trim() || null;
  //     const finalPhone = phone?.trim() || null;
  
  //     // Fetch all supervisors if no filters are provided
  //     if (!finalEmail && !finalFirstName && !finalLastName && !finalPhone) {
  //       const result = await supervisorQueries.getAllSupervisors(Number(page), Number(limit), orgId);
  //        res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.FOUND, result.rows));
  //        return;
  //     }
  
  //     // Fetch filtered supervisors
  //     const result = await supervisorQueries.getFilteredSupervisors(
  //       Number(page),
  //       Number(limit),
  //       orgId,
  //       finalEmail,
  //       finalFirstName,
  //       finalLastName,
  //       finalPhone
  //     );
  
  //     if (result.rows.length === 0) {
  //        res.status(404).json(errorResponse(ResponseMessages.SUPERVISOR.NOT_FOUND));
  //        return;
  //     }
  
  //      res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.FOUND, result.rows));
  //      return;
  //   } catch (error) {
  //     console.error('Error fetching filtered supervisors:', error);
  //      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
  //      return;
  //   }
  // }

  // static async getFilteredSupervisors(req: AuthenticatedRequest, res: Response): Promise<void> {
  //   try {
  //     const { page = 1, limit = 20, email, name, phone } = req.body;
  //     const orgId = req.user.isSuperAdmin ? undefined : req.user.orgId;  // If SuperAdmin, fetch all
  
  //     // Validate request
  //     const errors = validationResult(req);
  //     if (!errors.isEmpty()) {
  //       res.status(400).json(errorResponse(ResponseMessages.VALIDATION.FAILED, errors.array()));
  //       return;
  //     }
  
  //     // Trim and normalize input values
  //     const finalEmail = email?.trim() || null;
  //     const finalName = name?.trim() || null;
  //     const finalPhone = phone?.trim() || null;
  
  //     // Fetch all supervisors if no filters are provided
  //     if (!finalEmail && !finalName && !finalPhone && orgId === undefined) {
  //       const result = await supervisorQueries.getAllSupervisors(Number(page), Number(limit), orgId);
  //       res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.FOUND, result.rows));
  //       return;
  //     }
  
  //     // Fetch filtered supervisors
  //     const result = await supervisorQueries.getFilteredSupervisors(
  //       Number(page),
  //       Number(limit),
  //       orgId,
  //       finalEmail,
  //       finalName,
  //       finalPhone
  //     );
  
  //     if (result.rows.length === 0) {
  //       res.status(404).json(errorResponse(ResponseMessages.SUPERVISOR.NOT_FOUND));
  //       return;
  //     }
  
  //     res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.FOUND, result.rows));
  //   } catch (error) {
  //     console.error('Error fetching filtered supervisors:', error);
  //     res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
  //   }
  // }

  static async getFilteredSupervisors(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { page = 1, limit = 20, search = "" } = req.body;
        const orgId = req.user.isSuperAdmin ? undefined : req.user.orgId; 

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(errorResponse(ResponseMessages.VALIDATION.FAILED, errors.array()));
            return;
        }

        const trimmedSearch = search.trim();

        const result = await supervisorQueries.getFilteredSupervisors(
            Number(page),
            Number(limit),
            orgId,
            trimmedSearch
        );

        if (result.rows.length === 0) {
            res.status(404).json(errorResponse(ResponseMessages.SUPERVISOR.NOT_FOUND));
            return;
        }

        res.status(200).json(successResponse(ResponseMessages.SUPERVISOR.FOUND, result.rows));
    } catch (error) {
        console.error("Error fetching filtered supervisors:", error);
        res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
}

  
  
  
}