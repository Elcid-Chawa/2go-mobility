import { Router } from 'express';
import { DriverController } from './driver.controller';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '../../constants/roles';

const router = Router();

router.use(authenticate);

router.get('/me', requireRoles(UserRole.DRIVER, UserRole.ADMIN), DriverController.getProfile);
router.patch('/me/status', requireRoles(UserRole.DRIVER, UserRole.ADMIN), DriverController.updateStatus);
router.post('/me/location', requireRoles(UserRole.DRIVER, UserRole.ADMIN), DriverController.updateLocation);
router.get('/me/earnings', requireRoles(UserRole.DRIVER, UserRole.ADMIN), DriverController.getEarnings);

export default router;
