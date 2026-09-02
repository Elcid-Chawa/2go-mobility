import { Router } from 'express';
import { VehicleController } from './vehicle.controller';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '../../constants/roles';

const router = Router();

router.use(authenticate);

router.get('/', VehicleController.getVehicles);
router.get('/:id', VehicleController.getVehicleById);
router.post('/', requireRoles(UserRole.OPERATIONS, UserRole.ADMIN), VehicleController.createVehicle);

export default router;
