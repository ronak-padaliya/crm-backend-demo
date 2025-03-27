import { Router } from "express";
import { TaskController } from "../controllers/taskController.js";
import { authenticateToken, checkRole, getAllDataForSuperAdmin } from '../middleware/auth.js';


const router = Router();

// Get all tasks for a salesperson with pagination & filters
router.get("/", authenticateToken, getAllDataForSuperAdmin, TaskController.getTasks);

router.route("/:id/complete")
    .put(TaskController.completeTask);

export default router;