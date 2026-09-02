import { Router } from 'express';
import { CustomerController } from './customer.controller';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '../../constants/roles';

const router = Router();

router.use(authenticate);

router.get('/me', requireRoles(UserRole.CUSTOMER, UserRole.ADMIN), CustomerController.getProfile);
router.patch('/me', requireRoles(UserRole.CUSTOMER, UserRole.ADMIN), CustomerController.updateProfile);
router.post('/me/places', requireRoles(UserRole.CUSTOMER, UserRole.ADMIN), CustomerController.addSavedPlace);

export default router;
