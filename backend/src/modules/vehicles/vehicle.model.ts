import mongoose, { Schema } from 'mongoose';
import { VehicleCategory, VehicleStatus } from '../../constants/vehicleCategory';

export interface IVehicle {
  _id: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  registrationNumber: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  category: VehicleCategory;
  status: VehicleStatus;
  ownershipType?: string;
  leasingContactId?: mongoose.Types.ObjectId;
  telematics?: {
    odometerKm?: number;
    fuelLevel?: number;
    lastUpdate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      index: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vin: { type: String, required: true, unique: true, trim: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    color: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(VehicleCategory),
      default: VehicleCategory.STANDARD,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.ACTIVE,
      index: true,
    },
    ownershipType: { type: String },
    leasingContactId: {
      type: Schema.Types.ObjectId,
      ref: 'LeasingContact',
      index: true,
    },
    telematics: {
      odometerKm: { type: Number },
      fuelLevel: { type: Number },
      lastUpdate: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
