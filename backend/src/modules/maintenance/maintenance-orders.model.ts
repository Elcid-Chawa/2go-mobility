import mongoose, { Schema } from 'mongoose';

export interface IMaintenanceOrder {
  _id: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  reportedByDriverId: mongoose.Types.ObjectId;
  status: 'IN_PROGRESS' | 'REPORTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  priority: 'low' | 'medium' | 'high';
  defectDescription: string;
  estimatedCost?: number;
  scheduledDate?: Date;
  estimatedCompletionDate?: Date;
  actualCompletionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceOrderSchema = new Schema<IMaintenanceOrder>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    reportedByDriverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'REPORTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'REPORTED',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    defectDescription: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedCost: {
      type: Number,
      min: 0,
    },
    scheduledDate: {
      type: Date,
    },
    estimatedCompletionDate: {
      type: Date,
    },
    actualCompletionDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const MaintenanceOrder = mongoose.model<IMaintenanceOrder>('MaintenanceOrder', MaintenanceOrderSchema);
