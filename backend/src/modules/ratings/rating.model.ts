import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  tripId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  score: number;
  comment?: string;
  createdAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      unique: true, // Only one rating per trip (FR-070)
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const Rating = mongoose.model<IRating>('Rating', RatingSchema);
