import { Router } from 'express';
import { VehicleController } from './vehicle.controller';
import { authenticate, requirePermissions } from '../../middlewares/auth';
import { Permission } from '../../constants/permissions';
import { validate } from '../../middlewares/validate';
import { createVehicleSchema } from '../admin/admin.validation';

const router = Router();

router.use(authenticate);

router.get('/', requirePermissions(Permission.VIEW_OPERATIONS), VehicleController.getVehicles);
router.get('/:id', requirePermissions(Permission.VIEW_OPERATIONS), VehicleController.getVehicleById);
router.post('/', requirePermissions(Permission.FLEET_MANAGE), validate(createVehicleSchema), VehicleController.createVehicle);

export default router;
