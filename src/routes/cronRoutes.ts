import { Router } from "express";
import { checkOverdueTasks } from "../cron/overdueTasks";

const router = Router();

// router.get("/run-cron", async (req, res) => {
//     try {
//         await checkOverdueTasks();
//         res.json({ success: true, message: "Cron job executed manually." });
//     } catch (error) {
//         console.error("Error running cron:", error);
//         res.status(500).json({ success: false, message: "Cron execution failed." });
//     }
// });

export default router;
