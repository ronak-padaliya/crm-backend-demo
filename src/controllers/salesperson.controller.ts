import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { salespersonQueries } from '../query';
import { successResponse, errorResponse, ResponseMessages } from '../utils/responses';
import bcrypt from 'bcryptjs';
import { MailService } from '../services/mail.service';
import { AuthenticatedRequest } from '../types';

export class SalespersonController {

  static async createSalesperson(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, firstName, lastName, phone, orgId, supervisorId } = req.body;
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
  
      // Check if email exists
      const existingUser = await salespersonQueries.checkExistingEmail(email);
      if (existingUser.rows.length > 0) {
        return res.status(400).json(errorResponse(ResponseMessages.SALESPERSON.EMAIL_EXISTS));
      }
  
      // Insert user
      const userResult = await salespersonQueries.insertSalesperson(
        email, 
        hashedPassword, 
        firstName, 
        lastName, 
        phone, 
        orgId, 
        supervisorId
      );
  
      // Send email with temporary password
      try {
        await MailService.sendPasswordMail(email, tempPassword, 'salesperson');
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
  
      return res.status(201).json(successResponse(ResponseMessages.AUTH.USER_CREATED, {
        tempPassword: tempPassword
      }));
    } catch (error) {
      console.error('Add user error:', error);
      return res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async getAllSalespersons(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10 } = req.query;
      const isSuperAdmin = req.user.isSuperAdmin;
      const orgId = isSuperAdmin ? null : req.user.orgId;

      const result = await salespersonQueries.getAllSalespersons(Number(page), Number(limit), orgId);
      res.status(200).json(successResponse(ResponseMessages.SALESPERSON.FOUND, result.rows));
    } catch (error) {
      console.error('Error fetching salespersons:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async getSalespersonById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await salespersonQueries.getSalespersonById(id);
      if (result.rows.length === 0) {
        res.status(404).json(errorResponse(ResponseMessages.SALESPERSON.NOT_FOUND));
        return;
      }
      res.status(200).json(successResponse(ResponseMessages.SALESPERSON.FOUND, result.rows[0]));
    } catch (error) {
      console.error('Error fetching salesperson:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async updateSalesperson(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { firstName, lastName, phone } = req.body;

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const existingSalespersonResult = await salespersonQueries.getSalespersonById(id);
      if (existingSalespersonResult.rows.length === 0) {
        res.status(404).json({ message: 'Salesperson not found' });
        return;
      }

      const existingSalesperson = existingSalespersonResult.rows[0];

      const updatedFirstName = firstName !== undefined ? firstName : existingSalesperson.first_name;
      const updatedLastName = lastName !== undefined ? lastName : existingSalesperson.last_name;
      const updatedPhone = phone !== undefined ? phone : existingSalesperson.phone;

      const result = await salespersonQueries.updateSalesperson(id, updatedFirstName, updatedLastName, updatedPhone);
      res.status(200).json(successResponse(ResponseMessages.SALESPERSON.UPDATED, result.rows[0]));
    } catch (error) {
      console.error('Error updating salesperson:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async deleteSalesperson(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await salespersonQueries.deleteSalesperson(id);
      if (result.rowCount === 0) {
        res.status(404).json(errorResponse(ResponseMessages.SALESPERSON.NOT_FOUND));
        return;
      }
      res.status(200).json(successResponse(ResponseMessages.SALESPERSON.DELETED));
    } catch (error) {
      console.error('Error deleting salesperson:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  static async getFilteredSalespersons(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { page = 1, limit = 20, search = "" } = req.body;
        const orgId = req.user.isSuperAdmin ? null : req.user.orgId;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json(errorResponse(ResponseMessages.VALIDATION.FAILED, errors.array()));
            return;
        }

        const trimmedSearch = search.trim();

        const result = await salespersonQueries.getFilteredSalespersons(
            Number(page),
            Number(limit),
            orgId,
            trimmedSearch
        );

        if (result.rows.length === 0) {
            res.status(404).json(errorResponse(ResponseMessages.SALESPERSON.NOT_FOUND));
            return;
        }

        res.status(200).json(successResponse(ResponseMessages.SALESPERSON.FOUND, result.rows));
    } catch (error) {
        console.error("Error fetching filtered salespersons:", error);
        res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
}

  
}
