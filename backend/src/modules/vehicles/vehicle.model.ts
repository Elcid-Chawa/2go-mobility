import mongoose, { Schema } from 'mongoose';
import { VehicleCategory, VehicleStatus } from '../../constants/vehicleCategory';

export interface IVehicle {
  _id: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  category: VehicleCategory;
  status: VehicleStatus;
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
  },
  {
    timestamps: true,
  }
);

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
