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
  };
  documents: {
    idDocument?: string; // URL to document
    drivingLicense?: string; // URL to document
    vehicleRegistration?: string; // URL to document
    insuranceCertificate?: string; // URL to document
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
    },
    documents: {
      idDocument: { type: String },
      drivingLicense: { type: String },
      vehicleRegistration: { type: String },
      insuranceCertificate: { type: String },
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
