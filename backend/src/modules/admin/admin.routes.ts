import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '../../constants/roles';

const router = Router();

router.use(authenticate, requireRoles(UserRole.OPERATIONS, UserRole.ADMIN));

router.get('/dashboard', AdminController.getDashboard);
router.get('/trips', AdminController.getTrips);
router.get('/drivers', AdminController.getDrivers);
router.get('/vehicles', AdminController.getVehicles);
router.get('/customers', AdminController.getCustomers);
router.post('/trips/:id/assign', AdminController.manualAssign);

export default router;
