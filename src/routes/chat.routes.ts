import { Router, Request, Response } from 'express';
import db from '../helper/database';
import { errorResponse, successResponse } from '../utils/responses';
import { v4 as uuidv4 } from 'uuid';
import cloudinary from 'cloudinary';
import multer from 'multer';
import { AuthenticatedRequest } from '../types';
import { checkRole } from '../middleware/auth';


cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();


async function insertChatImages(data: { roomId: string; senderId: string; imageUrls: string[] }) {
    const { roomId, senderId, imageUrls } = data;

    // Start a client session
    const client = await db.pool.connect(); // Use db.pool to connect
    try {
        // Loop through each image URL and insert into chat_images
        for (const imageUrl of imageUrls) {
            await client.query(
                'INSERT INTO chat_images (room_id, sender_id, image_url) VALUES ($1, $2, $3)',
                [roomId, senderId, imageUrl]
            );
        }
        console.log('Images uploaded to database successfully');
    } catch (error) {
        console.error('Error inserting images into database:', error);
    } finally {
        // Release the client back to the pool
        client.release();
    }
}

router.get('/rooms/:roomId/messages', async (req: Request, res: Response): Promise<void> => {
    console.log('Received request for messages in room:', req.params.roomId);
    const { roomId } = req.params;
    const page = parseInt(req.params.page as string) || 1;
    const limit = parseInt(req.params.limit as string) || 20;
    const offset = (page - 1) * limit;

    try {
        const roomIdNum = parseInt(roomId, 10);
        if (isNaN(roomIdNum)) {
            res.status(400).json(errorResponse('Invalid room ID format'));
            return;
        }

        const roomCheck = await db.query('SELECT id FROM chat_rooms WHERE id = $1', [roomIdNum]);
        if (roomCheck.rowCount === 0) {
            res.status(404).json(errorResponse('Room not found'));
            return;
        }

        const messagesResult = await db.query(
            `SELECT sender_id, content, timestamp 
             FROM chat_messages 
             WHERE room_id = $1 
             ORDER BY timestamp ASC 
             LIMIT $2 OFFSET $3`,
            [roomIdNum, limit, offset]
        );

        if (messagesResult.rowCount === 0) {
            res.status(200).json(successResponse('No messages found', []));
            return;
        }

        console.log(` ${messagesResult.rowCount} messages found for Room ID: ${roomIdNum}`);

        const messages = messagesResult.rows.reverse();

        res.json(successResponse('Messages retrieved successfully', messages));
    } catch (error) {
        console.error(' Error fetching messages:', error);
        res.status(500).json(errorResponse('Internal Server Error', error.message));
    }
});


router.post('/messages', async (req: Request, res: Response): Promise<void> => {
    const { roomId, senderId, content } = req.body;

    try {
        // Validate input
        if (!roomId || !senderId || !content.trim()) {
            res.status(400).json(errorResponse('Room ID, Sender ID, and message content are required'));
            return;
        }
        console.log('Inserting message:', { roomId, senderId, content });

        const insertResult = await db.query(
            `INSERT INTO chat_messages (id, room_id, sender_id, content, timestamp) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
            [uuidv4(), roomId, senderId, content]
        );

        console.log('Message inserted:', insertResult.rows[0]);

        res.json(successResponse('Message inserted successfully', insertResult.rows[0]));
    } catch (error) {
        console.error(' Error inserting message:', error);
        res.status(500).json(errorResponse('Internal Server Error', error.message));
    }
});

router.post('/messages/image', upload.array('images', 5), async (req: Request, res: Response): Promise<void> => {
    try {
        const { roomId, senderId } = req.body;

        if (!roomId || !senderId) {
            res.status(400).json(errorResponse('Room ID and Sender ID are required'));
            return;
        }

        if (!req.files || req.files.length === 0) {
            res.status(400).json(errorResponse('At least one image file is required'));
            return;
        }

        const uploadPromises = req.files.map((file) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.v2.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
                    if (error) {
                        console.error('Error uploading to Cloudinary:', error);
                        return reject(error);
                    }
                    resolve(result.secure_url);
                });

                stream.end(file.buffer);
            });
        });

        const urls = await Promise.all(uploadPromises) as string[];

        await insertChatImages({ roomId, senderId, imageUrls: urls });

        res.json(successResponse('Images uploaded successfully', { roomId, senderId, imageUrls: urls }));
    } catch (error) {
        console.error('Error in image upload:', error);
        res.status(500).json(errorResponse('Internal Server Error', error.message));
    }
});

router.get('/messages/images/:roomId', async (req: Request, res: Response): Promise<void> => {
    const { roomId } = req.params;

    try {
        const result = await db.query(
            'SELECT image_url FROM chat_images WHERE room_id = $1',
            [roomId]
        );

        if (result.rowCount === 0) {
            res.status(404).json(errorResponse('No images found for this room ID'));
            return;
        }

        const imageUrls = result.rows.map(row => row.image_url);

        res.json(successResponse('Images retrieved successfully', { roomId, imageUrls }));
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json(errorResponse('Internal Server Error', error.message));
    }
});

export default router;
