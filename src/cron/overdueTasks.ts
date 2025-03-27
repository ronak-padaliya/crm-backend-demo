import cron from 'node-cron';
import { Server } from 'socket.io';
import db from '../helper/database.js';

// Reference to Socket.IO (Will be set later)
let io: Server;

export const setSocketIO = (socketIOInstance: Server) => {
    io = socketIOInstance;
};

export const checkOverdueTasks = async () => {
    console.log("Running daily task check...");

    const overdueTasks = await db.query(
        `SELECT t.id, t.salesperson_id, u.supervisor_id, tf.followup_date
         FROM tasks t
         JOIN users u ON t.salesperson_id = u.id
         JOIN task_followups tf ON tf.task_id = t.id
         WHERE t.status = 'Pending' 
         AND tf.followup_date + INTERVAL '1 day' < NOW()`
    );

    if (overdueTasks.rows.length === 0) {
        console.log("✅ No overdue tasks found.");
        return;
    }

    overdueTasks.rows.forEach(async (task) => {
        console.log(`🔔 Notifying supervisor ${task.supervisor_id}: Salesperson ${task.salesperson_id} has not completed their task.`);
        
        // Insert notification into DB
        const result = await db.query(
            `INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *`,
            [task.supervisor_id, `Salesperson ${task.salesperson_id} has not completed their task.`]
        );

        console.log("✅ Notification Inserted:", result.rows[0]);

        // Send Real-Time Notification to Supervisor via WebSocket
        if (io) {
            io.to(`supervisor_${task.supervisor_id}`).emit("notification", {
                message: `Salesperson ${task.salesperson_id} has not completed their task.`,
                timestamp: new Date().toISOString()
            });
            console.log(`📢 Real-time notification sent to Supervisor ${task.supervisor_id}`);
        }
    });

    console.log("✅ Daily task check completed.");
};

// Automatically schedule cron job at midnight every day
// cron.schedule('0 0 * * *', checkOverdueTasks);

// Schedule cron job to run at 5:51 PM IST (12:21 PM UTC) every day
// cron.schedule('21 12 * * *', checkOverdueTasks);

