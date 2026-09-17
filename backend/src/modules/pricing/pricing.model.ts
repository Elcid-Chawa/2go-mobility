import mongoose, { Document, Schema } from "mongoose";
import { VehicleCategory } from "../../constants/vehicleCategory";

export interface IPricingRule extends Document {
  category: VehicleCategory;
  baseFare: number;
  pricePerKm: number;
  pricePerMinute: number;
  longDistanceRate?: number;
  longDistanceThresholdKm?: number;
  minimumFare: number;
  surgeMultiplier: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PricingRuleSchema = new Schema<IPricingRule>(
  {
    category: {
      type: String,
      enum: Object.values(VehicleCategory),
      required: true,
      unique: true,
      index: true,
    },
    baseFare: { type: Number, required: true, default: 1000 },
    pricePerKm: { type: Number, required: true, default: 500 },
    pricePerMinute: { type: Number, required: true, default: 100 },
    longDistanceRate: { type: Number, default: 500 },
    longDistanceThresholdKm: { type: Number, default: 30 },
    minimumFare: { type: Number, required: true, default: 3000 },
    surgeMultiplier: { type: Number, required: true, default: 1.0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

export const PricingRule = mongoose.model<IPricingRule>(
  "PricingRule",
  PricingRuleSchema,
);
