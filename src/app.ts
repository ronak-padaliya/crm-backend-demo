import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import db from './helper/database.js';
import routes from './routes.js';
import cron from 'node-cron';
import moment from 'moment-timezone';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authenticateToken } from './middleware/auth.js';
import chatServer from './chatServer.js';
import { checkOverdueTasks, setSocketIO } from "./cron/overdueTasks.js";
import { initWebSocket } from './utils/notificationService.js';
import { EventEmitter } from 'events';

// ✅ Initialize Express & HTTP Server
const app = express();
const httpServer = http.createServer(app);

// ✅ Initialize WebSocket
initWebSocket(httpServer);

// ✅ Middleware Setup
app.use(cors({
  origin: '*',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// ✅ Public Test Route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working correctly!' });
});

// ✅ Token Authentication Middleware (Excluding Auth Routes)
app.use((req, res, next) => {
  const publicRoutes = ['/auth/login', '/auth/forgot-password', '/auth/refresh-token', '/auth/register-superadmin', '/health'];
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  authenticateToken(req, res, next);
});

// ✅ Register All Routes in One Place
app.use(routes);

// ✅ Initialize Chat Server
const wss = chatServer(httpServer);

// ✅ Scheduled Cron Job (Runs Every Day at Midnight)
cron.schedule('0 0 * * *', async () => {
  console.log(`[${moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}] ⏰ Running daily cron job...`);
  try {
    await checkOverdueTasks();
    console.log("✅ checkOverdueTasks executed successfully.");
  } catch (error) {
    console.error("❌ Error in checkOverdueTasks:", error);
  }
});

// ✅ Start Server After DB Connection
db.testConnection()
  .then((connected) => {
    if (connected) {
      const port = process.env.PORT ? Number(process.env.PORT) : 8000;
      httpServer.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port} (Env: ${process.env.NODE_ENV || 'development'})`);
      });
    } else {
      console.error('❌ Unable to connect to the database. Exiting...');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Database connection error:', error.message);
    setTimeout(() => process.exit(1), 100);
  });

// ✅ Graceful Shutdown
process.on('SIGINT', () => {
  console.log('🔴 Server shutting down...');
  db.closeConnection();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔴 Server terminating...');
  db.closeConnection();
  process.exit(0);
});

// ✅ Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const Bus = new EventEmitter();
Bus.setMaxListeners(20);

export default app;
