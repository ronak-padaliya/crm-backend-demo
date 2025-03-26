import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { successResponse, errorResponse, ResponseMessages } from '../utils/responses';
import { followUpIterationQueries } from '../query';
import { AuthenticatedRequest } from '../types';


export class FollowUpIterationsController {
  
  static async createFollowUpIteration(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { iteration, days, orgId: bodyOrgId } = req.body;
      const orgId = bodyOrgId || req.user.orgId; // Use orgId from token if not provided in body
      
      // Check if iteration already exists
      const existingIteration = await followUpIterationQueries.checkExistingIteration(iteration, orgId);
      if (existingIteration.rows.length > 0) {
        return res.status(400).json(errorResponse('Iteration already exists'));
      }
      
      // Insert follow-up iteration
      const result = await followUpIterationQueries.insertFollowUpIteration(iteration, days, orgId);
      return res.status(201).json(successResponse('Follow-up iteration created successfully', result.rows[0]));
    } catch (error) {
      console.error('Error creating follow-up iteration:', error);
      return res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
}

static async getAllFollowUpIterations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user || !req.user.orgId) {
      res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
      return;
    }
    
    const { page = 1, limit = 10 } = req.query;
    const orgId = req.user.orgId;
    const result = await followUpIterationQueries.getAllFollowUpIterations(Number(page), Number(limit), orgId);
    res.json(result.rows);
    return;
  } catch (error) {
    console.error('Error fetching follow-up iterations:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
  }
}

static async getFollowUpIterationById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    if (!req.user || !req.user.orgId) {
      res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
      return;
    }
    
    const result = await followUpIterationQueries.getFollowUpIterationById(id, req.user.orgId);
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Follow-up iteration not found or unauthorized' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching follow-up iteration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

static async updateFollowUpIteration(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { iteration, days } = req.body;

  try {
    if (!req.user || !req.user.orgId) {
      res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
      return;
    }
    
    const existingIterationResult = await followUpIterationQueries.getFollowUpIterationById(id, req.user.orgId);
    if (existingIterationResult.rows.length === 0) {
      res.status(404).json({ message: 'Follow-up iteration not found or unauthorized' });
      return;
    }
    
    const updatedIteration = iteration !== undefined ? iteration : existingIterationResult.rows[0].iteration;
    const updatedDays = days !== undefined ? days : existingIterationResult.rows[0].days;
    
    const result = await followUpIterationQueries.updateFollowUpIteration(Number(id), updatedIteration, updatedDays, req.user.orgId);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating follow-up iteration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

static async deleteFollowUpIteration(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    if (!req.user || !req.user.orgId) {
      res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
      return;
    }
    
    const result = await followUpIterationQueries.deleteFollowUpIteration(Number(id), req.user.orgId);
    if (result.rowCount === 0) {
      res.status(404).json({ message: 'Follow-up iteration not found or unauthorized' });
      return;
    }
    res.json({ message: 'Follow-up iteration deleted successfully' });
  } catch (error) {
    console.error('Error deleting follow-up iteration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
}