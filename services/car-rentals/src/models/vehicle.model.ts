import mongoose, { Schema } from "mongoose";

export const RENTAL_CATEGORIES = ["ECONOMY", "COMPACT", "SEDAN", "SUV", "LUXURY", "VAN"] as const;
export type RentalCategory = (typeof RENTAL_CATEGORIES)[number];
export type RentalVehicleStatus = "PENDING" | "ACTIVE" | "REJECTED" | "MAINTENANCE" | "INACTIVE";

export interface RentalVehicle {
  agencyId: mongoose.Types.ObjectId;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  vin: string;
  category: RentalCategory;
  seats: number;
  transmission: "AUTOMATIC" | "MANUAL";
  fuel: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
  city: string;
  description: string;
  photoUrl?: string;
  status: RentalVehicleStatus;
  reviewNotes?: string;
  lockToken?: string;
  lockExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<RentalVehicle>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: "RentalAgency", required: true, index: true },
    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    year: { type: Number, required: true, min: 1990, max: new Date().getFullYear() + 1 },
    registrationNumber: { type: String, required: true, trim: true, uppercase: true },
    vin: { type: String, required: true, trim: true, uppercase: true },
    category: { type: String, enum: RENTAL_CATEGORIES, required: true, index: true },
    seats: { type: Number, required: true, min: 2, max: 30 },
    transmission: { type: String, enum: ["AUTOMATIC", "MANUAL"], required: true },
    fuel: { type: String, enum: ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"], required: true },
    city: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    photoUrl: { type: String, trim: true },
    status: { type: String, enum: ["PENDING", "ACTIVE", "REJECTED", "MAINTENANCE", "INACTIVE"], default: "PENDING", index: true },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    lockToken: { type: String, select: false },
    lockExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);
vehicleSchema.index({ registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ vin: 1 }, { unique: true });

export const RentalVehicleModel = mongoose.model<RentalVehicle>("RentalVehicle", vehicleSchema);
