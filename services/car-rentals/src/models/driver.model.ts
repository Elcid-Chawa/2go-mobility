import mongoose, { Schema } from "mongoose";

export type RentalDriverStatus = "PENDING" | "ACTIVE" | "REJECTED" | "INACTIVE";

export interface RentalDriver {
  agencyId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiresAt: Date;
  documentFilename?: string;
  documentMimeType?: string;
  dailyRate: number;
  status: RentalDriverStatus;
  reviewNotes?: string;
  lockToken?: string;
  lockExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<RentalDriver>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: "RentalAgency", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    licenseNumber: { type: String, required: true, trim: true, uppercase: true },
    licenseExpiresAt: { type: Date, required: true },
    documentFilename: { type: String },
    documentMimeType: { type: String },
    dailyRate: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["PENDING", "ACTIVE", "REJECTED", "INACTIVE"], default: "PENDING", index: true },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    lockToken: { type: String, select: false },
    lockExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);
driverSchema.index({ agencyId: 1, licenseNumber: 1 }, { unique: true });

export const RentalDriverModel = mongoose.model<RentalDriver>("RentalDriver", driverSchema);
