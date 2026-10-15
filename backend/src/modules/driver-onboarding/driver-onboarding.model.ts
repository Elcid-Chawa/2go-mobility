import mongoose, { Document, Schema } from "mongoose";
import {
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from "../../constants/onboardingStatus";

export interface IOnboarding extends Document {
  driverId: mongoose.Types.ObjectId;
  onboardingStatus: DriverOnboardingStatus;
  verificationStatus: DriverVerificationStatus;
  personalInfo: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    phoneNumber?: string;
    idDocumentType?: string;
    idDocumentNumber?: string;
    drivingLicenseNumber?: string;
    drivingLicenseExpiryDate?: Date;
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  vehicleInfo: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    licensePlate?: string;
    vin?: string;
    category?: string;
  };
  documents: {
    idDocument?: string; // URL to document
    drivingLicense?: string; // URL to document
    vehicleRegistration?: string; // URL to document
    insuranceCertificate?: string; // URL to document
    profilePhoto?: string;
    vehiclePreviewImage?: string;
  };
  review?: {
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    notes?: string;
    rejectionReason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingSchema: Schema = new Schema<IOnboarding>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      unique: true,
      index: true,
    },
    onboardingStatus: {
      type: String,
      enum: Object.values(DriverOnboardingStatus),
      default: DriverOnboardingStatus.NOT_STARTED,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(DriverVerificationStatus),
      default: DriverVerificationStatus.NOT_VERIFIED,
      index: true,
    },
    personalInfo: {
      firstName: { type: String },
      lastName: { type: String },
      dateOfBirth: { type: Date },
      phoneNumber: { type: String },
      idDocumentType: { type: String },
      idDocumentNumber: { type: String },
      drivingLicenseNumber: { type: String },
      drivingLicenseExpiryDate: { type: Date },
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String, default: "Rwanda" },
    },
    vehicleInfo: {
      make: { type: String },
      model: { type: String },
      year: { type: Number },
      color: { type: String },
      licensePlate: { type: String },
      vin: { type: String },
      category: { type: String, enum: ["STANDARD", "COMFORT", "PREMIUM", "XL"], default: "STANDARD" },
    },
    documents: {
      idDocument: { type: String },
      drivingLicense: { type: String },
      vehicleRegistration: { type: String },
      insuranceCertificate: { type: String },
      profilePhoto: { type: String },
      vehiclePreviewImage: { type: String },
    },
    review: {
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
      notes: { type: String },
      rejectionReason: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

export const Onboarding = mongoose.model<IOnboarding>(
  "Onboarding",
  OnboardingSchema,
);
