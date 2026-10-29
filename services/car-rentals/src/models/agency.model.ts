import mongoose, { Schema } from "mongoose";

export type AgencyStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface RentalAgency {
  ownerUserId: string;
  name: string;
  registrationNumber: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  managedByPlatform: boolean;
  status: AgencyStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const agencySchema = new Schema<RentalAgency>(
  {
    ownerUserId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    registrationNumber: { type: String, required: true, trim: true, uppercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    managedByPlatform: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"], default: "PENDING", index: true },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);
agencySchema.index({ registrationNumber: 1 }, { unique: true });

export const RentalAgencyModel = mongoose.model<RentalAgency>("RentalAgency", agencySchema);
