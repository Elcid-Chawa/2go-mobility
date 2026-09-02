import { Router } from 'express';
import { RatingController } from './rating.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/:id/rating', RatingController.submitRating);

export default router;
