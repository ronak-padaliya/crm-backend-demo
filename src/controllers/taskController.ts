import { Request, Response } from "express";
import db from "../helper/database";
import { successResponse, errorResponse } from "../utils/responses";
import * as taskModel from "../models/taskModel";
import { AuthenticatedRequest } from '../types';


export class TaskController {
    static async getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { salespersonId, page = 1, limit = 10, status, startDate, endDate } = req.query;
            const { role, orgId } = req.user; // Extracted from token
    
            let query = `
                SELECT t.* FROM tasks t
                JOIN users u ON t.salesperson_id = u.id
                WHERE 1=1
            `;
            const params: any[] = [];
    
            // Restrict data access based on role
            if (role !== "superAdmin") {
                query += ` AND u.org_id = $${params.length + 1}`;
                params.push(orgId);
            }
    
            // Filter by salespersonId if provided
            if (salespersonId) {
                query += ` AND t.salesperson_id = $${params.length + 1}`;
                params.push(salespersonId);
            }
    
            // Filter by status (Pending or Completed)
            if (status && (status === 'Pending' || status === 'Completed')) {
                query += ` AND t.status = $${params.length + 1}`;
                params.push(status);
            }
    
            // Filter by date range
            if (startDate && endDate) {
                query += ` AND t.created_at BETWEEN $${params.length + 1} AND $${params.length + 2}`;
                params.push(startDate, endDate);
            }
    
            // Pagination
            query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(String(limit), String((Number(page) - 1) * Number(limit)));
    
            const tasks = await db.query(query, params);
            res.json(successResponse("Tasks fetched successfully", tasks.rows));
        } catch (error) {
            console.error("Error fetching tasks:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }
    
    


    static async completeTask(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await taskModel.completeTask(Number(id));
            res.json(successResponse("Task marked as completed."));
        } catch (error) {
            console.error("Error completing task:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }

}
