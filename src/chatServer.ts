// import WebSocket, { WebSocketServer } from 'ws';
// import db from './helper/database'; // Adjust the path to your actual database module

// const rooms = new Map(); // Track users per room

// const chatServer = (httpServer) => {
//     const wss = new WebSocketServer({ server: httpServer }); // Define wss here

//     wss.on('connection', (ws) => {
//         console.log('New user connected');

//         ws.on('message', async (message) => {
//             const messageData = JSON.parse(message);

//             // Handle joining a room
//             if (messageData.type === 'join') {
//                 const { roomId } = messageData;

//                 // Ensure the room exists
//                 if (!rooms.has(roomId)) {
//                     rooms.set(roomId, new Set());
//                 }

//                 rooms.get(roomId).add(ws); // Add user to the room
//                 console.log(`User joined room ${roomId}`);
//             }

//             const { senderId, content, roomId } = messageData;

//             // Ensure room exists
//             if (!rooms.has(roomId)) {
//                 rooms.set(roomId, new Set());
//             }

//             rooms.get(roomId).add(ws); // Add user to the room

//             // Save message in the database
//             try {
//                 await db.query(
//                     'INSERT INTO chat_messages (sender_id, content, room_id) VALUES ($1, $2, $3)',
//                     [senderId, content, roomId]
//                 );

//                 // Broadcast only to users in the same room
//                 rooms.get(roomId).forEach(client => {
//                     if (client.readyState === WebSocket.OPEN) {
//                         client.send(JSON.stringify(messageData));
//                     }
//                 });
//             } catch (error) {
//                 console.error('Error inserting message into database:', error);
//             }
//         });

//         ws.on('close', () => {
//             console.log('User disconnected');
//             // Remove the user from any rooms they were in
//             rooms.forEach((clients, roomId) => {
//                 clients.delete(ws);
//                 if (clients.size === 0) rooms.delete(roomId);
//             });
//         });
//     });

//     return wss; // Return wss if needed
// };

// export default chatServer;


import { Server } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import db from './helper/database';

const rooms = new Map<string, Set<WebSocket>>(); // Track users per room

const chatServer = (httpServer: Server) => {
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    wss.on('connection', (ws) => {
        console.log('New user connected');

        // Keep WebSocket connection alive (ping every 25s)
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('message', async (message) => {
            const messageData = JSON.parse(message);
            const { senderId, content, roomId } = messageData;

            // Ensure room exists
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add(ws);

            try {
                await db.query(
                    'INSERT INTO chat_messages (sender_id, content, room_id) VALUES ($1, $2, $3)',
                    [senderId, content, roomId]
                );

                // Broadcast only to users in the same room
                rooms.get(roomId).forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(messageData));
                    }
                });
            } catch (error) {
                console.error('Error inserting message into database:', error);
            }
        });

        ws.on('close', () => {
            console.log('User disconnected');
            rooms.forEach((clients, roomId) => {
                clients.delete(ws);
                if (clients.size === 0) rooms.delete(roomId);
            });
        });

        // Set up a keep-alive mechanism
        const keepAliveInterval = setInterval(() => {
            wss.clients.forEach((client) => {
                if (client.isAlive === false) {
                    console.log("Terminating inactive WebSocket connection");
                    return client.terminate();
                }
                client.isAlive = false;
                client.ping();
            });
        }, 25000);

        // Clear the interval when the connection is closed
        ws.on('close', () => {
            clearInterval(keepAliveInterval);
        });
    });

    return wss;
};

export default chatServer;
