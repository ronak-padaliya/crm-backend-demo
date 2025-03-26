import express from 'express';
import db from '../helper/database';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/auth';

const router = express.Router();

// Create Room Endpoint
// router.post('/create', authenticateToken, checkRole('admin'), async (req: express.Request, res: express.Response): Promise<void> => {
    router.post('/create', authenticateToken, async (req: express.Request, res: express.Response): Promise<void> => {
    const { name } = req.body;

    // Validate room name
    if (!name) {
        res.status(400).json({ message: 'Room name is required' });
        return;
    }

    try {
        const result = await db.query(
            'INSERT INTO chat_rooms (name) VALUES ($1) RETURNING id',
            [name]
        );
        const roomId = result.rows[0].id;
        res.status(201).json({ roomId, message: `Room created! Share this ID: ${roomId}` });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ message: 'Error creating room', error: error.message });
    }
});

// Join Room Endpoint
router.post('/join', authenticateToken, async (req, res) => {
    const { roomId } = req.body;

    try {
        // Check if the room exists
        const room = await db.query('SELECT * FROM chat_rooms WHERE id = $1', [roomId]);

        if (room.rows.length > 0) {
            res.status(200).json({ message: 'Joined room successfully', roomId });
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ message: 'Error joining room' });
    }
});

export default router;