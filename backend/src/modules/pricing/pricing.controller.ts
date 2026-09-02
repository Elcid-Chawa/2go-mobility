import { Request, Response, NextFunction } from 'express';
import { PricingService } from './pricing.service';
import { ApiResponse } from '../../utils/apiResponse';

export class PricingController {
  static async estimate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pickup, destination, category } = req.body;

      if (category) {
        const estimate = await PricingService.calculateEstimate(
          pickup.coordinates,
          destination.coordinates,
          category
        );
        ApiResponse.success(res, estimate, 'Fare estimate calculated');
      } else {
        const estimates = await PricingService.calculateAllCategories(
          pickup.coordinates,
          destination.coordinates
        );
        ApiResponse.success(res, estimates, 'Fare estimates calculated for all categories');
      }
    } catch (error) {
      next(error);
    }
  }
}
