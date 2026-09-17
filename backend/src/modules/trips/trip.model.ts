import mongoose, { Document, Schema } from 'mongoose';
import { TripStatus, PaymentStatus, PaymentMethod } from '../../constants/tripStatus';
import { VehicleCategory } from '../../constants/vehicleCategory';

export interface ITripLocationPoint {
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface ITrip extends Document {
  customerId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  rejectedDriverIds: mongoose.Types.ObjectId[];
  vehicleId?: mongoose.Types.ObjectId;
  pickup: ITripLocationPoint;
  destination: ITripLocationPoint;
  distanceKm: number;
  estimatedDurationMinutes: number;
  estimatedFare: number;
  finalFare?: number;
  waitingFare?: number;
  category: VehicleCategory;
  status: TripStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cancellationReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  timestamps: {
    requestedAt: Date;
    assignedAt?: Date;
    acceptedAt?: Date;
    arrivedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    paidAt?: Date;
    cancelledAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      index: true,
    },
    rejectedDriverIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Driver',
    }],
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    pickup: {
      address: { type: String, required: true },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
        },
      },
    },
    destination: {
      address: { type: String, required: true },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
        },
      },
    },
    distanceKm: {
      type: Number,
      required: true,
    },
    estimatedDurationMinutes: {
      type: Number,
      required: true,
    },
    estimatedFare: {
      type: Number,
      required: true,
    },
    finalFare: {
      type: Number,
    },
    waitingFare: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: Object.values(VehicleCategory),
      default: VehicleCategory.STANDARD,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TripStatus),
      default: TripStatus.REQUESTED,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CASH,
    },
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    timestamps: {
      requestedAt: { type: Date, default: Date.now },
      assignedAt: { type: Date },
      acceptedAt: { type: Date },
      arrivedAt: { type: Date },
      startedAt: { type: Date },
      completedAt: { type: Date },
      paidAt: { type: Date },
      cancelledAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

TripSchema.index({ 'pickup.location': '2dsphere' });
TripSchema.index({ 'destination.location': '2dsphere' });

export const Trip = mongoose.model<ITrip>('Trip', TripSchema);
