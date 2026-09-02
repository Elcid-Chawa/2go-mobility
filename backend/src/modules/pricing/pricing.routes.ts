import { Router } from 'express';
import { PricingController } from './pricing.controller';
import { validate } from '../../middlewares/validate';
import { estimateFareSchema } from './pricing.validation';

const router = Router();

router.post('/estimate', validate(estimateFareSchema), PricingController.estimate);

export default router;
