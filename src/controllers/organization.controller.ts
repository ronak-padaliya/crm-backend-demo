import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { validationResult } from 'express-validator';
import { organizationQueries } from '../query';
import { successResponse, errorResponse, ResponseMessages } from '../utils/responses';

export class OrganizationController {
  constructor() {
    this.getAllOrganizations = this.getAllOrganizations.bind(this);
    this.getOrganizationById = this.getOrganizationById.bind(this);
    this.updateOrganization = this.updateOrganization.bind(this);
    this.deleteOrganization = this.deleteOrganization.bind(this);
    // this.getFilteredOrganizations = this.getFilteredOrganizations.bind(this);/
  }

  async getAllOrganizations(req: Request, res: Response) {
    try {
      const result = await organizationQueries.getAllOrganizations();
      res.status(200).json(successResponse(ResponseMessages.ORGANIZATION.FOUND, result.rows));
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  async getOrganizationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await organizationQueries.getOrganizationById(id);

      if (result.rows.length === 0) {
        return res.status(404).json(errorResponse(ResponseMessages.ORGANIZATION.NOT_FOUND));
      }

      res.status(200).json(successResponse(ResponseMessages.ORGANIZATION.FOUND, result.rows[0]));
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  async updateOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { org_name } = req.body;

      if (!org_name) {
        return res.status(400).json(errorResponse(ResponseMessages.ORGANIZATION.NAME_REQUIRED));
      }

      const result = await organizationQueries.updateOrganization(org_name, id);

      if (result.rows.length === 0) {
        return res.status(404).json(errorResponse(ResponseMessages.ORGANIZATION.NOT_FOUND));
      }

      res.status(200).json(successResponse(ResponseMessages.ORGANIZATION.UPDATED, result.rows[0]));
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  async deleteOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await organizationQueries.deleteOrganization(id);

      if (result.rows.length === 0) {
        return res.status(404).json(errorResponse(ResponseMessages.ORGANIZATION.NOT_FOUND));
      }

      res.status(200).json(successResponse(ResponseMessages.ORGANIZATION.DELETED));
    } catch (error) {
      console.error('Error deleting organization:', error);
      res.status(500).json(errorResponse(ResponseMessages.SERVER.ERROR));
    }
  }

  // static async getFilteredOrganizations(req: AuthenticatedRequest, res: Response): Promise<void> {
  //   try {
  //     const { page = 1, limit = 20, org_name } = req.body;
  
  //     // Ensure page and limit are numbers
  //     const finalPage = Number(page);
  //     const finalLimit = Number(limit);
  
  //     if (isNaN(finalPage) || isNaN(finalLimit)) {
  //        res.status(400).json(errorResponse("Page and limit must be numbers"));
  //        return;
  //     }
  
  //     // Trim and normalize input values
  //     const finalOrgName = org_name?.trim() || null;
  
  //     // Fetch filtered organizations
  //     const result = await organizationQueries.getFilteredOrganizations(
  //       finalPage,
  //       finalLimit,
  //       finalOrgName
  //     );
  
  //     if (result.rows.length === 0) {
  //       res.status(404).json(errorResponse("No organizations found"));
  //       return;
  //     }
  
  //     res.status(200).json(successResponse("Organizations found", result.rows));
  //   } catch (error) {
  //     console.error("Error fetching organizations:", error);
  //     res.status(500).json(errorResponse("Internal Server Error", error.message));
  //   }
  // }
  static async getFilteredOrganizations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { page = 1, limit = 20, search = "" } = req.body;

        // Ensure page and limit are numbers
        const finalPage = Number(page);
        const finalLimit = Number(limit);

        if (isNaN(finalPage) || isNaN(finalLimit)) {
            res.status(400).json(errorResponse("Page and limit must be numbers"));
            return;
        }

        // Trim and normalize input value
        const trimmedSearch = search.trim();

        // Fetch filtered organizations
        const result = await organizationQueries.getFilteredOrganizations(
            finalPage,
            finalLimit,
            trimmedSearch
        );

        if (result.rows.length === 0) {
            res.status(404).json(errorResponse("No organizations found"));
            return;
        }

        res.status(200).json(successResponse("Organizations found", result.rows));
    } catch (error) {
        console.error("Error fetching organizations:", error);
        res.status(500).json(errorResponse("Internal Server Error", error.message));
    }
}

  
  
  



}
