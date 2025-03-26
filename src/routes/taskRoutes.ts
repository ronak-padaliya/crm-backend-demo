import { Router } from "express";
import { TaskController } from "../controllers/taskController";
import { authenticateToken, checkRole, getAllDataForSuperAdmin } from '../middleware/auth';


const router = Router();

// Get all tasks for a salesperson with pagination & filters
router.get("/", authenticateToken, getAllDataForSuperAdmin, TaskController.getTasks);

router.route("/:id/complete")
    .put(TaskController.completeTask);

export default router;