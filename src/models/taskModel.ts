import db from '../helper/database.js';
import { getIterations } from '../config/iterations.js';

export const createTask = async (salesCardId, salespersonId) => {
    const task = await db.query(
        `INSERT INTO tasks (sales_card_id, salesperson_id) VALUES ($1, $2) RETURNING *`,
        [salesCardId, salespersonId]
    );
    
    const taskId = task.rows[0].id;
    const iterations = await getIterations(db);
    const f1Days = iterations['F1'] || 5;
    const f1Date = new Date();
    f1Date.setDate(f1Date.getDate() + f1Days);
    
    await db.query(
        `INSERT INTO task_followups (task_id, iteration, followup_date) VALUES ($1, 'F1', $2)`,
        [taskId, f1Date]
    );
    
    return task.rows[0];
};

// export const createTask = async (salesCardId, salespersonId) => {
//     const task = await db.query(
//         `INSERT INTO tasks (sales_card_id, salesperson_id) VALUES ($1, $2) RETURNING *`,
//         [salesCardId, salespersonId]
//     );

//     const taskId = task.rows[0].id;
//     const iterations = await getIterations(db);
    
//     let lastFollowupDate = new Date(); // Start from today's date

//     for (const [iteration, days] of Object.entries(iterations)) {
//         lastFollowupDate.setDate(lastFollowupDate.getDate() + (days as number));
//         await db.query(
//             `INSERT INTO task_followups (task_id, iteration, followup_date) VALUES ($1, $2, $3)`,
//             [taskId, iteration, lastFollowupDate]
//         );
//     }
    
//     return task.rows[0];
// };

export const completeTask = async (taskId) => {
    await db.query(`UPDATE tasks SET status = 'Completed', updated_at = NOW() WHERE id = $1`, [taskId]);
    
    const iterations = await getIterations(db);
    const lastFollowup = await db.query(
        `SELECT iteration FROM task_followups WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [taskId]
    );
    
    const lastIteration = lastFollowup.rows[0]?.iteration;

    // Check if lastIteration is defined and has the expected format
    if (lastIteration && lastIteration.length > 1) {
        const nextIterationKey = `F${parseInt(lastIteration[1]) + 1}`;
        const nextDays = iterations[nextIterationKey];
        
        if (nextDays) {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + nextDays);
            
            await db.query(
                `INSERT INTO task_followups (task_id, iteration, followup_date) VALUES ($1, $2, $3)`,
                [taskId, nextIterationKey, nextDate]
            );
        }
    } else {
        console.warn("No valid last iteration found for task:", taskId);
    }
};  