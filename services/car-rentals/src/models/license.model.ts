import mongoose, { Schema } from "mongoose";

export type LicenseStatus = "PENDING" | "VERIFIED" | "REJECTED";
export interface RentalLicense {
  userId: string;
  licenseNumber: string;
  issuingCountry: string;
  expiresAt: Date;
  documentFilename?: string;
  documentMimeType?: string;
  status: LicenseStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const licenseSchema = new Schema<RentalLicense>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    licenseNumber: { type: String, required: true, trim: true, uppercase: true },
    issuingCountry: { type: String, required: true, trim: true, maxlength: 80 },
    expiresAt: { type: Date, required: true },
    documentFilename: { type: String },
    documentMimeType: { type: String },
    status: { type: String, enum: ["PENDING", "VERIFIED", "REJECTED"], default: "PENDING", index: true },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

export const RentalLicenseModel = mongoose.model<RentalLicense>("RentalLicense", licenseSchema);
