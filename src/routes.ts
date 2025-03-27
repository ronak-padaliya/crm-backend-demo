import { Router } from 'express';
import authRoutes from './routes/auth.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import adminRoutes from './routes/admin.routes.js';
import supervisorRoutes from './routes/supervisor.routes.js';
import salespersonRoutes from './routes/salesperson.routes.js';
import rolesPermissionsRoutes from './routes/rolesPermissions.routes.js';
import salesCardsRoutes from './routes/salesCards.routes.js';
import customersRoutes from './routes/customers.routes.js';
import chatRoutes from './routes/chat.routes.js';
import roomsRoutes from './routes/rooms.routes.js';
import taskRoutes from "./routes/taskRoutes.js";
import followUpIterationsRoutes from "./routes/followUpIterations.routes.js";
import cronRoutes from "./routes/cronRoutes.js";

const router = Router();

router.use('/auth', authRoutes);
router.use('/api/organizations', organizationRoutes);
router.use('/api/admins', adminRoutes);
router.use('/api/supervisors', supervisorRoutes);
router.use('/api/salespersons', salespersonRoutes);
router.use('/api/roles-permissions', rolesPermissionsRoutes);
router.use('/api/sales-cards', salesCardsRoutes);
router.use('/api/customers', customersRoutes);
router.use('/api', chatRoutes);
router.use('/api/rooms', roomsRoutes);
router.use("/api/tasks", taskRoutes);
router.use("/api/followup-iterations", followUpIterationsRoutes);
router.use("/cron", cronRoutes);

export default router;
