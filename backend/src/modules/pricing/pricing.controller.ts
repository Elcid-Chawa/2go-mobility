import { Request, Response, NextFunction } from "express";
import { PricingService } from "./pricing.service";
import { ApiResponse } from "../../utils/apiResponse";
import { resolveLocationValue } from "../../utils/geo";

export class PricingController {
  static async estimate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { pickup, destination, category } = req.body;
      const pickupLocation = await resolveLocationValue(pickup);
      const destinationLocation = await resolveLocationValue(destination);

      if (category) {
        const estimate = await PricingService.calculateEstimate(
          pickupLocation.coordinates,
          destinationLocation.coordinates,
          category,
        );
        ApiResponse.success(res, estimate, "Fare estimate calculated");
      } else {
        const estimates = await PricingService.calculateAllCategories(
          pickupLocation.coordinates,
          destinationLocation.coordinates,
        );
        ApiResponse.success(
          res,
          estimates,
          "Fare estimates calculated for all categories",
        );
      }
    } catch (error) {
      next(error);
    }
  }
}
