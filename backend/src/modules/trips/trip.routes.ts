import { Router } from 'express';
import { TripController } from './trip.controller';
import { authenticate, requireRoles } from '../../middlewares/auth';
import { UserRole } from '../../constants/roles';

const router = Router();

router.use(authenticate);

// Customer endpoints
router.post('/', requireRoles(UserRole.CUSTOMER, UserRole.ADMIN), TripController.createTrip);
router.get('/:id', TripController.getTrip);

// Driver lifecycle endpoints
router.post('/:id/accept', requireRoles(UserRole.DRIVER, UserRole.ADMIN), TripController.acceptTrip);
router.post('/:id/reject', requireRoles(UserRole.DRIVER, UserRole.ADMIN), TripController.rejectTrip);
router.post('/:id/arrive', requireRoles(UserRole.DRIVER, UserRole.ADMIN), TripController.markArrived);
router.post('/:id/start', requireRoles(UserRole.DRIVER, UserRole.ADMIN), TripController.startTrip);
router.post('/:id/location', requireRoles(UserRole.DRIVER, UserRole.ADMIN), TripController.recordLocation);
router.post('/:id/complete', requireRoles(UserRole.DRIVER, UserRole.ADMIN), TripController.completeTrip);

// General cancellation
router.post('/:id/cancel', TripController.cancelTrip);

export default router;
