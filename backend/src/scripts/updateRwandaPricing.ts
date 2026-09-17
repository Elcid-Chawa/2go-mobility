import { connectDatabase, disconnectDatabase } from "../config/database";
import { VehicleCategory } from "../constants/vehicleCategory";
import { PricingRule } from "../modules/pricing/pricing.model";
import { logger } from "../config/logger";

const rates = [
  { category: VehicleCategory.STANDARD, baseFare: 800, pricePerKm: 700, pricePerMinute: 0, minimumFare: 1500, longDistanceRate: 500, longDistanceThresholdKm: 30 },
  { category: VehicleCategory.COMFORT, baseFare: 1000, pricePerKm: 875, pricePerMinute: 0, minimumFare: 2500, longDistanceRate: 625, longDistanceThresholdKm: 30 },
  { category: VehicleCategory.PREMIUM, baseFare: 1600, pricePerKm: 1120, pricePerMinute: 0, minimumFare: 5000, longDistanceRate: 800, longDistanceThresholdKm: 30 },
  { category: VehicleCategory.XL, baseFare: 1200, pricePerKm: 1000, pricePerMinute: 0, minimumFare: 3500, longDistanceRate: 750, longDistanceThresholdKm: 30 },
];

async function updateRwandaPricing() {
  try {
    await connectDatabase();
    await PricingRule.bulkWrite(
      rates.map((rate) => ({
        updateOne: {
          filter: { category: rate.category },
          update: { $set: { ...rate, surgeMultiplier: 1, isActive: true } },
          upsert: true,
        },
      })),
    );
    logger.info("Rwanda pricing rules updated without modifying users or trips");
  } finally {
    await disconnectDatabase();
  }
}

updateRwandaPricing().catch((error) => {
  logger.error("Unable to update Rwanda pricing", { error });
  process.exitCode = 1;
});
