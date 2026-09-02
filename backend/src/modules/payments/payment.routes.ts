import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/:id/payment', PaymentController.recordPayment);
router.get('/:id/payment', PaymentController.getPayment);

export default router;
