// Dedicated collection for emergency escalations, SOS signals, and legal/insurance reporting.

import mongoose, { Schema, Document } from 'mongoose';

export interface IIncident extends Document {
  _id: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  tripId?: mongoose.Types.ObjectId;
  vehicleId?: mongoose.Types.ObjectId;
  type: 'SECURITY_ALERT' | 'ACCIDENT' | 'SOS_TRIGGERED';
  description: string;
  status: 'IN_PROGRESS' | 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISCPATCHED_HELP';
  resolutionDetails?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  assignedOpsManagerId?: mongoose.Types.ObjectId; // ref to Users
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      index: true,
    },
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      index: true,
    },
    type: {
      type: String,
      enum: ['SECURITY_ALERT', 'ACCIDENT', 'SOS_TRIGGERED'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED', 'DISCPATCHED_HELP'],
      default: 'TRIGGERED',
    },
    resolutionDetails: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
    },
    assignedOpsManagerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);