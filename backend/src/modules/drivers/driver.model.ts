import mongoose, { Document, Schema } from 'mongoose';
import {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverOnlineStatus,
} from '../../constants/tripStatus';

export interface IDriver extends Document {
  userId: mongoose.Types.ObjectId;
  licenseNumber: string;
  approvalStatus: DriverApprovalStatus;
  onlineStatus: DriverOnlineStatus;
  availabilityStatus: DriverAvailabilityStatus;
  currentLocation: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  currentHeading?: number;
  rating: number;
  totalTrips: number;
  totalEarnings: number;
  activeVehicleId?: mongoose.Types.ObjectId;
  lastLocationUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema = new Schema<IDriver>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(DriverApprovalStatus),
      default: DriverApprovalStatus.APPROVED, // Auto-approved for MVP
      index: true,
    },
    onlineStatus: {
      type: String,
      enum: Object.values(DriverOnlineStatus),
      default: DriverOnlineStatus.OFFLINE,
      index: true,
    },
    availabilityStatus: {
      type: String,
      enum: Object.values(DriverAvailabilityStatus),
      default: DriverAvailabilityStatus.AVAILABLE,
      index: true,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },
    currentHeading: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    totalTrips: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    activeVehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    lastLocationUpdate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for proximity driver queries
DriverSchema.index({ currentLocation: '2dsphere' });
DriverSchema.index({ onlineStatus: 1, availabilityStatus: 1, approvalStatus: 1 });

export const Driver = mongoose.model<IDriver>('Driver', DriverSchema);
