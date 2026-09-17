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
  fareType: "URBAN" | "INTERCITY";
  pricingNotice?: string;
}

export class PricingService {
  /**
   * Default fallback pricing parameters per category
   */
  private static defaultRates: Record<
    VehicleCategory,
    { base: number; perKm: number; perMin: number; min: number; longDistanceRate: number; longDistanceThresholdKm: number }
  > = {
    [VehicleCategory.STANDARD]: {
      base: 800,
      perKm: 700,
      perMin: 0,
      min: 1500,
      longDistanceRate: 500,
      longDistanceThresholdKm: 30,
    },
    [VehicleCategory.COMFORT]: {
      base: 1000,
      perKm: 875,
      perMin: 0,
      min: 2500,
      longDistanceRate: 625,
      longDistanceThresholdKm: 30,
    },
    [VehicleCategory.PREMIUM]: {
      base: 1600,
      perKm: 1120,
      perMin: 0,
      min: 5000,
      longDistanceRate: 800,
      longDistanceThresholdKm: 30,
    },
    [VehicleCategory.XL]: {
      base: 1200,
      perKm: 1000,
      perMin: 0,
      min: 3500,
      longDistanceRate: 750,
      longDistanceThresholdKm: 30,
    },
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
    routedDistanceKm?: number,
  ): Promise<FareEstimate> {
    const directDistanceKm = calculateDistanceKm(
      pickupCoordinates,
      destinationCoordinates,
    );
    // Until authoritative road routing is hosted server-side, compensate for
    // Rwanda's winding urban and mountainous intercity roads.
    const roadFactor = directDistanceKm > 30 ? 1.4 : directDistanceKm > 10 ? 1.22 : 1.18;
    const safeRoutedDistance = routedDistanceKm &&
      routedDistanceKm >= directDistanceKm &&
      routedDistanceKm <= directDistanceKm * 2.5
        ? routedDistanceKm
        : directDistanceKm * roadFactor;
    const distanceKm = Math.round(safeRoutedDistance * 100) / 100;
    const durationMinutes = estimateDurationMinutes(distanceKm);

    const rule = await this.getPricingRule(category);
    const rates = rule
      ? {
          base: rule.baseFare,
          perKm: rule.pricePerKm,
          perMin: rule.pricePerMinute,
          min: rule.minimumFare,
          surge: rule.surgeMultiplier || 1.0,
          longDistanceRate: rule.longDistanceRate ?? rule.pricePerKm,
          longDistanceThresholdKm: rule.longDistanceThresholdKm ?? 30,
        }
      : {
          ...this.defaultRates[category],
          surge: 1.0,
        };

    const standardDistanceKm = Math.min(distanceKm, rates.longDistanceThresholdKm);
    const longDistanceKm = Math.max(0, distanceKm - rates.longDistanceThresholdKm);
    const distanceFare = Math.round(
      (standardDistanceKm * rates.perKm + longDistanceKm * rates.longDistanceRate) * 100,
    ) / 100;
    const timeFare = Math.round(durationMinutes * rates.perMin * 100) / 100;
    const rawFare = (rates.base + distanceFare + timeFare) * rates.surge;
    const estimatedFare = Math.max(rates.min, Math.round(rawFare / 100) * 100);
    const fareType = distanceKm > rates.longDistanceThresholdKm ? "INTERCITY" : "URBAN";

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
      fareType,
      pricingNotice: fareType === "INTERCITY"
        ? "Intercity private-car estimate. Border processing, visas, tolls, parking and overnight charges are not included. Cross-border trips require driver confirmation."
        : "Estimated metered fare; waiting after the free allowance may be charged separately.",
    };
  }

  /**
   * Calculates all categories simultaneously for ride comparison
   */
  static async calculateAllCategories(
    pickupCoordinates: [number, number],
    destinationCoordinates: [number, number],
    routedDistanceKm?: number,
  ): Promise<FareEstimate[]> {
    const categories = Object.values(VehicleCategory);
    return Promise.all(
      categories.map((cat) =>
        this.calculateEstimate(pickupCoordinates, destinationCoordinates, cat, routedDistanceKm),
      ),
    );
  }
}
