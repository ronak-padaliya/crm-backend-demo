// controllers/salesCardController.ts
import { Request, Response, NextFunction } from "express";
import { salesCardQueries } from "../query.js";
import { successResponse, errorResponse } from "../utils/responses.js";
import { createTask } from "../models/taskModel.js";
import { notificationQueries } from "../query.js";
import { AuthenticatedRequest } from '../types/index.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { UploadApiResponse } from 'cloudinary';

import { sendNotificationForSalesCard } from '../utils/notificationService.js';
// import { sendWebSocketNotification } from '../app'; // Adjust the path as necessary

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up multer for parsing form-data
const upload = multer({ storage: multer.memoryStorage() });

export class SalesCardController {
    static async getSalesCards(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const orgId = req.user.orgId;
            const result = await salesCardQueries.getSalesCards(Number(page), Number(limit), orgId);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: "No sales cards found", data: [] });
            }
            res.json(successResponse("Sales cards fetched successfully", result.rows));
        } catch (error) {
            console.error("Error fetching sales cards:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }

    static async getSalesCardById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await salesCardQueries.getSalesCardById(Number(id));
            if (result.rows.length === 0) {
                return res.status(404).json(errorResponse("Sales card not found"));
            }
            res.json(successResponse("Sales card fetched successfully", result.rows[0]));
        } catch (error) {
            console.error("Error fetching sales card:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }

    static async addSalesCard(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId, customerId, statusId, title, description } = req.body;
            const result = await salesCardQueries.addSalesCard(userId, customerId, statusId, title, description);
            const salesCard = result.rows[0];
            
            // Create a corresponding task for this sales card
            await createTask(salesCard.id, userId);
            
            res.status(201).json(successResponse("Sales card added successfully", salesCard));
        } catch (error) {
            console.error("Error adding sales card:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }

//     Expected Workflow
// Salesperson updates the sales card to "Order Confirmed"

// Must upload an image.
// Select Admin, Supervisor, or All for notification.
// API responds with "Waiting for approval" message.
// Notification is sent to Supervisor and/or Admin

// Supervisor/Admin sees image, sales card name, and customer name.
// Supervisor can approve or reject the request.
// If approved by Supervisor

// Admin receives a notification: "Supervisor approved order confirmation".
// Salesperson receives a notification: "Your request was approved by Supervisor".
// Sales card status updates to "Order Confirmed".
// If rejected by Supervisor

// Salesperson gets a notification: "Your request was rejected by Supervisor".

    static async updateSalesCard(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { statusId, title, description } = req.body;
            const result = await salesCardQueries.updateSalesCard(Number(id), statusId, title, description);
            res.json(successResponse("Sales card updated successfully", result.rows[0]));
        } catch (error) {
            console.error("Error updating sales card:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }

    static async updateSalesCardForOrderConfirmed(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { statusId, title, description, notifyRoles } = req.body;
            const userId = req.user.userId;
            const supervisorId = req.user.supervisorId; // Get supervisor ID from token
            const file = req.file;
    
            let imageUrl: string | null = req.body.imageUrl || null;
    
            console.log("🔍 [DEBUG] Incoming request to update Sales Card");
            console.log("📌 SalesCard ID:", id);
            console.log("📌 Status ID:", statusId);
            console.log("📌 Title:", title);
            console.log("📌 Description:", description);
            console.log("📌 Notify Roles:", notifyRoles);
            console.log("📌 Salesperson ID:", userId);
            console.log("📌 Supervisor ID from Token:", supervisorId);
    
            // Ensure an image is uploaded for statusId = 4 (Order Confirmed)
            if (statusId == 4 && !file) {
                console.error("❌ [ERROR] Image is required to confirm the order.");
                res.status(400).json(errorResponse("Image is required to confirm the order."));
                return;
            }
    
            // Upload image to Cloudinary if file is provided
            if (file) {
                try {
                    console.log("📤 Uploading image to Cloudinary...");
                    const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                resource_type: 'image',
                                folder: 'sales_cards',
                            },
                            (error, result) => {
                                if (error) {
                                    console.error("❌ Cloudinary Upload Error:", error);
                                    reject(error);
                                } else {
                                    resolve(result);
                                }
                            }
                        );
                        uploadStream.end(file.buffer);
                    });
    
                    imageUrl = uploadResult.secure_url;
                    console.log("✅ Image uploaded successfully:", imageUrl);
                } catch (error) {
                    console.error("❌ Error uploading to Cloudinary:", error);
                    res.status(500).json(errorResponse("Failed to upload image"));
                    return;
                }
            }
    
            // Check if a notification already exists
            console.log("🔎 Checking if an approval request already exists...");
            const existingNotification = await notificationQueries.getNotificationBySalesCardId(Number(id));
            if (existingNotification.rows.length > 0) {
                console.warn("⚠️ [WARNING] Approval request already pending for Sales Card:", id);
                res.status(400).json(errorResponse("Approval request already pending."));
                return;
            }
    
            // Fetch admin ID from the supervisor row
            let adminId: number | null = null;
            if (notifyRoles.includes("admin")) {
                console.log("🔎 Fetching Admin ID from Supervisor ID:", supervisorId);
                const adminResult = await notificationQueries.getAdminBySupervisorId(supervisorId);
                adminId = adminResult?.rows?.[0]?.admin_id || null;
                console.log("📌 Found Admin ID:", adminId);
            }
    
            // Store notifications for each selected role
            const notifications = [];
            if (notifyRoles.includes("supervisor") && supervisorId) {
                console.log(`📨 Sending notification to Supervisor (ID: ${supervisorId})`);
                const notification = await notificationQueries.createNotification(
                    Number(id), userId, "supervisor", supervisorId, imageUrl || ''
                );
                notifications.push(notification.rows[0]);
    
                sendNotificationForSalesCard(supervisorId, {
                    title: "Approval Required",
                    message: `Sales card "${title}" from customer requires approval.`,
                    image_url: imageUrl || '',
                });
                console.log("✅ Notification sent to Supervisor successfully!");
            }
    
            if (notifyRoles.includes("admin") && adminId) {
                console.log(`📨 Sending notification to Admin (ID: ${adminId})`);
                const notification = await notificationQueries.createNotification(
                    Number(id), userId, "admin", adminId, imageUrl || ''
                );
                notifications.push(notification.rows[0]);
    
                sendNotificationForSalesCard(adminId, {
                    title: "Approval Required",
                    message: `Sales card "${title}" from customer requires approval.`,
                    image_url: imageUrl || '',
                });
                console.log("✅ Notification sent to Admin successfully!");
            }
    
            console.log("🎉 [SUCCESS] Sales Card updated successfully & notifications sent.");
            res.status(200).json(successResponse("Waiting for approval", notifications));
        } catch (error) {
            console.error("❌ Error updating sales card:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }
    
    

    static async approveSalesCard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { notificationId } = req.params;
            const userRole = req.user.role;
            const userOrgId = req.user.orgId; // Organization ID from token
    
            console.log("🔍 [DEBUG] Approving Sales Card");
            console.log("📌 Notification ID:", notificationId);
            console.log("📌 Approving Role:", userRole);
            console.log("📌 User Organization ID:", userOrgId);
    
            // Fetch notification details
            const notificationResult = await notificationQueries.getNotificationById(Number(notificationId));
            const notification = notificationResult.rows[0];
    
            if (!notification) {
                console.error("❌ [ERROR] Notification not found.");
                res.status(404).json(errorResponse("Notification not found."));
                return;
            }
    
            if (notification.status === "approved") {
                console.error("⚠️ [WARNING] Already approved by another role.");
                res.status(403).json(errorResponse("Already approved by another role."));
                return;
            }
    
            // Fetch sales card details and verify organization
            const salesCardResult = await salesCardQueries.getSalesCardById(notification.sales_card_id);
            const salesCard = salesCardResult.rows[0];
    
            if (!salesCard) {
                console.error("❌ [ERROR] Sales card not found.");
                res.status(404).json(errorResponse("Sales card not found."));
                return;
            }
    
            // Check if the sales card belongs to the same organization
            if (salesCard.org_id !== userOrgId) {
                console.error("🚫 [ERROR] You are not authorized to approve this notification.");
                res.status(403).json(errorResponse("Unauthorized: Cannot approve a notification from another organization."));
                return;
            }
    
            // Approve the notification
            await notificationQueries.approveNotification(Number(notificationId), userRole);
            console.log(`✅ [SUCCESS] ${userRole} approved the sales card.`);
    
            // Update sales card status
            await salesCardQueries.updateSalesCardForOrderConfirmed(notification.sales_card_id, 4, salesCard.title, salesCard.description, notification.image_url);
    
            // Remove the other pending approval
            if (notification.receiver_role === "supervisor") {
                console.log("🗑️ Removing Admin's notification since Supervisor approved.");
                await notificationQueries.removeNotification(notification.sales_card_id, "admin");
            } else if (notification.receiver_role === "admin") {
                console.log("🗑️ Removing Supervisor's notification since Admin approved.");
                await notificationQueries.removeNotification(notification.sales_card_id, "supervisor");
            }
    
            // Notify Salesperson
            sendNotificationForSalesCard(notification.sales_card_id, {
                title: "Order Confirmed",
                message: `Your sales card "${salesCard.title}" is confirmed.`,
                image_url: notification.image_url
            });
    
            console.log("🎉 [SUCCESS] Sales Card approved & notifications updated.");
            res.status(200).json(successResponse("Sales card approved successfully."));
        } catch (error) {
            console.error("❌ [ERROR] Approving sales card failed:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }
    

    static async rejectSalesCard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { notificationId } = req.params;
            const userRole = req.user.role;
            const userOrgId = req.user.orgId; // Organization ID from token
    
            console.log("🔍 [DEBUG] Rejecting Sales Card");
            console.log("📌 Notification ID:", notificationId);
            console.log("📌 Rejecting Role:", userRole);
            console.log("📌 User Organization ID:", userOrgId);
    
            // Fetch notification details
            const notificationResult = await notificationQueries.getNotificationById(Number(notificationId));
            const notification = notificationResult.rows[0];
    
            if (!notification) {
                console.error("❌ [ERROR] Notification not found.");
                res.status(404).json(errorResponse("Notification not found."));
                return;
            }
    
            if (notification.status === "approved") {
                console.error("⚠️ [WARNING] Already approved by another role.");
                res.status(403).json(errorResponse("Already approved by another role."));
                return;
            }
    
            // Fetch sales card details and verify organization
            const salesCardResult = await salesCardQueries.getSalesCardById(notification.sales_card_id);
            const salesCard = salesCardResult.rows[0];
    
            if (!salesCard) {
                console.error("❌ [ERROR] Sales card not found.");
                res.status(404).json(errorResponse("Sales card not found."));
                return;
            }
    
            // Check if the sales card belongs to the same organization
            if (salesCard.org_id !== userOrgId) {
                console.error("🚫 [ERROR] You are not authorized to reject this notification.");
                res.status(403).json(errorResponse("Unauthorized: Cannot reject a notification from another organization."));
                return;
            }
    
            // Reject the notification
            await notificationQueries.rejectNotification(Number(notificationId));
            console.log(`❌ [SUCCESS] ${userRole} rejected the sales card.`);
    
            // Remove the other pending approval
            if (notification.receiver_role === "supervisor") {
                console.log("🗑️ Removing Admin's notification since Supervisor rejected.");
                await notificationQueries.removeNotification(notification.sales_card_id, "admin");
            } else if (notification.receiver_role === "admin") {
                console.log("🗑️ Removing Supervisor's notification since Admin rejected.");
                await notificationQueries.removeNotification(notification.sales_card_id, "supervisor");
            }
    
            // Notify Salesperson
            sendNotificationForSalesCard(notification.sales_card_id, {
                title: "Order Rejected",
                message: `Your sales card "${salesCard.title}" was rejected by ${userRole}.`,
                image_url: notification.image_url
            });
    
            console.log("🎉 [SUCCESS] Sales Card rejected & notifications updated.");
            res.status(200).json(successResponse("Sales card rejected successfully."));
        } catch (error) {
            console.error("❌ [ERROR] Rejecting sales card failed:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }
    
    
    
    
    


    static async softDeleteSalesCard(req: Request, res: Response, next: NextFunction ) {
        try {
            const { id } = req.params;
            const result = await salesCardQueries.softDeleteSalesCard(Number(id));
            res.json(successResponse("Sales card deleted successfully", result.rows[0]));
        } catch (error) {
            console.error("Error deleting sales card:", error);
            res.status(500).json(errorResponse("Internal Server Error"));
        }
    }

  static async getLatestSalesCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        console.log("Request Query Received:", req.params);

        // Ensure customerPhone is extracted as a string and trimmed
        const customerPhone = req.params.customerPhone ? String(req.params.customerPhone).trim() : null;

        // Convert customerPhone to a number if it's present
        let parsedPhone: number | null = null;
        if (customerPhone !== null) {
            parsedPhone = Number(customerPhone);
            if (isNaN(parsedPhone)) {
                res.status(400).json({ success: false, message: "Invalid customerPhone format. It must be a number." });
                return;
            }
        } else {
            res.status(400).json({ success: false, message: "customerPhone is required." });
            return;
        }

        console.log("Fetching sales card with:", { customerPhone: parsedPhone });

        // Fetch sales cards from the database
        const result = await salesCardQueries.getLatestSalesCard(parsedPhone);

        if (!result || result.rows.length === 0) {
            res.status(404).json({ success: false, message: "No sales cards found", data: [] });
            return;
        }

        res.json(successResponse("Sales card fetched successfully", result.rows));
    } catch (error) {
        console.error("Error fetching latest sales card:", error);
        res.status(500).json(errorResponse("Internal Server Error", error.message || "An unexpected error occurred"));
    }
}







//   static async getFilteredSalesCards(req: Request, res: Response, next: NextFunction): Promise<void> {
//     const { page = 1, limit = 20, userId, statusId, title } = req.body;

//     // Validate request
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         res.status(400).json({ errors: errors.array() });
//         return;
//     }

//     // Trim input values to remove whitespace
//     const trimmedUserId = userId ? userId.trim() : null;
//     const trimmedStatusId = statusId ? statusId.trim() : null;
//     const trimmedTitle = title ? title.trim() : null;

//     // Treat empty strings or whitespace as null
//     const finalUserId = trimmedUserId && trimmedUserId.length > 0 ? trimmedUserId : null;
//     const finalStatusId = trimmedStatusId && trimmedStatusId.length > 0 ? trimmedStatusId : null;
//     const finalTitle = trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : null;

//     try {
//         // Check if all filter fields are empty
//         if (!finalUserId && !finalStatusId && !finalTitle) {
//             // If all fields are empty, return all sales cards
//             const result = await salesCardQueries.getSalesCards(Number(page), Number(limit));
//             res.json(result.rows);
//             return;
//         }

//         // If any field is provided, filter the sales cards
//         const result = await salesCardQueries.getFilteredSalesCards(Number(page), Number(limit), finalUserId, finalStatusId, finalTitle);
        
//         // Check if any records were found
//         if (result.rows.length === 0) {
//             res.status(404).json({ message: 'No sales cards found matching the criteria.' });
//             return;
//         }

//         res.json(result.rows);
//         return;
//     } catch (error) {
//         console.error('Error fetching filtered sales cards:', error);
//         res.status(500).json({ message: 'Internal server error' });
//         return;
//     }
//   }
}

