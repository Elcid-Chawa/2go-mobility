import { PricingRule, IPricingRule } from "./pricing.model";
import { VehicleCategory } from "../../constants/vehicleCategory";
import { calculateDistanceKm, estimateDurationMinutes } from "../../utils/geo";

export interface FareEstimate {
  category: VehicleCategory;
  distanceKm: number;
  estimatedDurationMinutes: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  estimatedFare: number;
  currency: string;
}

export class PricingService {
  /**
   * Default fallback pricing parameters per category
   */
  private static defaultRates: Record<
    VehicleCategory,
    { base: number; perKm: number; perMin: number; min: number }
  > = {
    [VehicleCategory.STANDARD]: {
      base: 1000,
      perKm: 500,
      perMin: 100,
      min: 3000,
    },
    [VehicleCategory.COMFORT]: {
      base: 1500,
      perKm: 700,
      perMin: 150,
      min: 5000,
    },
    [VehicleCategory.PREMIUM]: {
      base: 2500,
      perKm: 1000,
      perMin: 250,
      min: 8000,
    },
    [VehicleCategory.XL]: { base: 2000, perKm: 900, perMin: 200, min: 7000 },
  };

  /**
   * Retrieves active pricing rule from database or falls back to defaults
   */
  static async getPricingRule(
    category: VehicleCategory,
  ): Promise<IPricingRule | null> {
    try {
      return await PricingRule.findOne({ category, isActive: true });
    } catch {
      return null;
    }
  }

  /**
   * Calculates comprehensive fare estimate
   */
  static async calculateEstimate(
    pickupCoordinates: [number, number], // [lng, lat]
    destinationCoordinates: [number, number],
    category: VehicleCategory = VehicleCategory.STANDARD,
  ): Promise<FareEstimate> {
    const distanceKm = calculateDistanceKm(
      pickupCoordinates,
      destinationCoordinates,
    );
    const durationMinutes = estimateDurationMinutes(distanceKm);

    const rule = await this.getPricingRule(category);
    const rates = rule
      ? {
          base: rule.baseFare,
          perKm: rule.pricePerKm,
          perMin: rule.pricePerMinute,
          min: rule.minimumFare,
          surge: rule.surgeMultiplier || 1.0,
        }
      : {
          ...this.defaultRates[category],
          surge: 1.0,
        };

    const distanceFare = Math.round(distanceKm * rates.perKm * 100) / 100;
    const timeFare = Math.round(durationMinutes * rates.perMin * 100) / 100;
    const rawFare = (rates.base + distanceFare + timeFare) * rates.surge;
    const estimatedFare = Math.max(rates.min, Math.round(rawFare * 100) / 100);

    return {
      category,
      distanceKm,
      estimatedDurationMinutes: durationMinutes,
      baseFare: rates.base,
      distanceFare,
      timeFare,
      surgeMultiplier: rates.surge,
      estimatedFare,
      currency: "RWF",
    };
  }

  /**
   * Calculates all categories simultaneously for ride comparison
   */
  static async calculateAllCategories(
    pickupCoordinates: [number, number],
    destinationCoordinates: [number, number],
  ): Promise<FareEstimate[]> {
    const categories = Object.values(VehicleCategory);
    return Promise.all(
      categories.map((cat) =>
        this.calculateEstimate(pickupCoordinates, destinationCoordinates, cat),
      ),
    );
  }
}
