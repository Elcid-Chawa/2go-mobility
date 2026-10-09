import mongoose, {Document, Schema} from "mongoose";

export interface IDriverKYC extends Document {
  _id: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  documentType: 'DRIVER_LICENSE' | 'NATIONAL_ID' | 'PASSPORT';
  documentNumber: string;
  documentExpiryDate?: Date;
  documentImageUrl: string;
  insurance?: {
    policyNumber: string;
    provider: string;
    expiryDate: Date;
    insuranceImageUrl?: string;
  };
  cooperativeMembership?: {
    cooperativeName: string;
    membershipNumber: string;
    membershipExpiryDate?: Date;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  needsReverification?: string; // Reason for re-verification if status is REJECTED
  createdAt: Date;
  updatedAt: Date;
}

const DriverKYCSchema = new Schema<IDriverKYC>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      unique: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['DRIVER_LICENSE', 'NATIONAL_ID', 'PASSPORT'],
      required: true,
    },
    documentNumber: {
      type: String,
      required: true,
    },
    documentExpiryDate: {
      type: Date,
    },
    documentImageUrl: {
      type: String,
      required: true,
    },
    insurance: {
      policyNumber: { type: String },
      provider: { type: String },
      expiryDate: { type: Date },
      insuranceImageUrl: { type: String },
    },
    cooperativeMembership: {
      cooperativeName: { type: String },
      membershipNumber: { type: String },
      membershipExpiryDate: { type: Date },
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const DriverKYCModel = mongoose.model<IDriverKYC>('DriverKYC', DriverKYCSchema);