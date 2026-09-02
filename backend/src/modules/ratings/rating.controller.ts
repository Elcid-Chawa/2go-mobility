import { Response, NextFunction } from 'express';
import { RatingService } from './rating.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middlewares/auth';

export class RatingController {
  static async submitRating(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { score, comment } = req.body;
      const rating = await RatingService.submitRating(req.params.id as string, req.userId!, score, comment);
      ApiResponse.created(res, rating, 'Rating submitted successfully');
    } catch (error) {
      next(error);
    }
  }
}
