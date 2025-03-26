import { Server } from "socket.io";

let io: Server;

export const initWebSocket = (server: any) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            allowedHeaders: ['Content-Type', 'Authorization'],
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        }
    });

    io.on("connection", (socket) => {
        console.log(`✅ Supervisor connected: ${socket.id}`);

        socket.on("join", (userId) => {
            console.log(`User ${userId} joined`);
            socket.join(`user_${userId}`);
        });

        socket.on("disconnect", () => {
            console.log(`❌ User disconnected: ${socket.id}`);
        });
    });
};

// Function to send a real-time notification to the supervisor
// export const sendNotificationForSalesCard = (userId: number, notification: { title: string, message: string, image_url: string }) => {
//     if (!userId) {
//         console.error("❌ Error: Missing userId for notification", notification);
//         return;
//     }
// };

export const sendNotificationForSalesCard = (salesCardId: number, notification: { title: string, message: string, image_url: string }) => {
    if (!salesCardId) {
        console.error("❌ Error: Missing salesCardId for notification", notification);
        return;
    }
    if (!io) {
        console.error("Notification emitter is not initialized.");
        return;
    }
    console.log("Sending notification:", notification);
    io.emit("notification", { salesCardId, ...notification });
};

export const sendNotification = (userId: number, notification: any) => {
    io.to(`user_${userId}`).emit("notification", notification);
    console.log(`✅ Sent real-time notification to Supervisor ${userId}`);
};