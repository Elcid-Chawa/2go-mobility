import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requirePermissions } from '../../middlewares/auth';
import { Permission } from '../../constants/permissions';
import { validate } from '../../middlewares/validate';
import {
  createManagedUserSchema,
  updateUserStatusSchema,
  createVehicleSchema,
  updateVehicleStatusSchema,
  manualAssignSchema,
} from './admin.validation';

const router = Router();

router.use(authenticate);

router.get('/dashboard', requirePermissions(Permission.VIEW_OPERATIONS), AdminController.getDashboard);
router.get('/trips', requirePermissions(Permission.VIEW_OPERATIONS), AdminController.getTrips);
router.get('/drivers', requirePermissions(Permission.VIEW_OPERATIONS), AdminController.getDrivers);
router.get('/vehicles', requirePermissions(Permission.VIEW_OPERATIONS), AdminController.getVehicles);
router.get('/customers', requirePermissions(Permission.VIEW_OPERATIONS), AdminController.getCustomers);
router.get('/users', requirePermissions(Permission.USER_MANAGE), AdminController.getUsers);
router.post('/users', requirePermissions(Permission.USER_MANAGE), validate(createManagedUserSchema), AdminController.createUser);
router.patch('/users/:id/status', requirePermissions(Permission.USER_MANAGE), validate(updateUserStatusSchema), AdminController.updateUserStatus);
router.post('/vehicles', requirePermissions(Permission.FLEET_MANAGE), validate(createVehicleSchema), AdminController.createVehicle);
router.patch('/vehicles/:id/status', requirePermissions(Permission.FLEET_MANAGE), validate(updateVehicleStatusSchema), AdminController.updateVehicleStatus);
router.post('/trips/:id/assign', requirePermissions(Permission.DISPATCH_EXECUTE), validate(manualAssignSchema), AdminController.manualAssign);

export default router;
