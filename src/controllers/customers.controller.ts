import { Request, Response, NextFunction } from "express";
import { customerQueries } from "../query.js";
import { successResponse, errorResponse } from "../utils/responses.js";
import { error } from "console";

export class CustomerController {
  // Get all customers  
  static async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page = 1, limit = 10 } = req.query;

      const result = await customerQueries.getCustomers(Number(page), Number(limit));

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "No customers found",
          data: []
        });
        return;
      }

      res.json(successResponse("Customers fetched successfully", result.rows));
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json(errorResponse("Internal Server Error", error.message || "An unexpected error occurred"));
    }
  }

  // Get a single customer by ID
  static async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await customerQueries.getCustomerById(Number(id));
      if (result.rows.length === 0) {
        res.status(404).json(errorResponse("Customer not found", error));
        return;
      }
      res.json(successResponse("Customer fetched successfully", result.rows[0]));
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json(errorResponse("Internal Server Error", error));
    }
  }

  // Add a new customer
  static async addCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstname, lastname, email, phone } = req.body;
      const result = await customerQueries.addCustomer(firstname, lastname, email, phone);
      res.status(201).json(successResponse("Customer added successfully", result.rows[0]));
    } catch (error) {
      console.error("Error adding customer:", error);
      res.status(500).json(errorResponse("Internal Server Error", error));
    }
  }

  // Update an existing customer
  static async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { firstname, lastname, email, phone } = req.body;
      const result = await customerQueries.updateCustomer(Number(id), firstname, lastname, email, phone);
      res.json(successResponse("Customer updated successfully", result.rows[0]));
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json(errorResponse("Internal Server Error", error));
    }
  }

  // Soft delete a customer
  static async softDeleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await customerQueries.softDeleteCustomer(Number(id));
      res.json(successResponse("Customer deleted successfully", result.rows[0]));
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json(errorResponse("Internal Server Error", error));
    }
  }
}