import mongoose, { Document, Schema } from 'mongoose';

export interface ITripLocation extends Document {
  tripId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  heading: number;
  speed: number;
  timestamp: Date;
}

const TripLocationSchema = new Schema<ITripLocation>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
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
    heading: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
  }
);

TripLocationSchema.index({ location: '2dsphere' });

export const TripLocation = mongoose.model<ITripLocation>('TripLocation', TripLocationSchema);
