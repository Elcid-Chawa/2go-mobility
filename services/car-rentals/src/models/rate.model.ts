import mongoose, { Schema } from "mongoose";
import { RENTAL_CATEGORIES, RentalCategory } from "./vehicle.model";

export type RateStatus = "PENDING" | "ACTIVE" | "REJECTED";

export interface RentalRate {
  agencyId: mongoose.Types.ObjectId;
  category: RentalCategory;
  currency: string;
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  minimumHours: number;
  securityDeposit: number;
  chauffeurDailyRate: number;
  status: RateStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rateSchema = new Schema<RentalRate>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: "RentalAgency", required: true, index: true },
    category: { type: String, enum: RENTAL_CATEGORIES, required: true },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    hourlyRate: { type: Number, required: true, min: 0 },
    dailyRate: { type: Number, required: true, min: 0 },
    weeklyRate: { type: Number, required: true, min: 0 },
    minimumHours: { type: Number, required: true, min: 1, max: 168, default: 24 },
    securityDeposit: { type: Number, required: true, min: 0 },
    chauffeurDailyRate: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["PENDING", "ACTIVE", "REJECTED"], default: "PENDING", index: true },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);
rateSchema.index(
  { agencyId: 1, category: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } },
);

export const RentalRateModel = mongoose.model<RentalRate>("RentalRate", rateSchema);
