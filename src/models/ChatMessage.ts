export interface ChatMessage {
    senderId: string; // User ID of the sender
    receiverId: string; // User ID of the receiver (optional)
    content: string; // Message content
    timestamp: Date; // Timestamp of the message
    roomId: string; // Room ID
} 