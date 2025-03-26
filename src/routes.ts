import { Router } from 'express';
import authRoutes from './routes/auth.routes';
import organizationRoutes from './routes/organization.routes';
import adminRoutes from './routes/admin.routes';
import supervisorRoutes from './routes/supervisor.routes';
import salespersonRoutes from './routes/salesperson.routes';
import rolesPermissionsRoutes from './routes/rolesPermissions.routes';
import salesCardsRoutes from './routes/salesCards.routes';
import customersRoutes from './routes/customers.routes';
import chatRoutes from './routes/chat.routes';
import roomsRoutes from './routes/rooms.routes';
import taskRoutes from "./routes/taskRoutes";
import followUpIterationsRoutes from "./routes/followUpIterations.routes";
import cronRoutes from "./routes/cronRoutes";

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
