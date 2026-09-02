import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedPlace {
  name: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface ITrustedContact {
  name: string;
  phone: string;
}

export interface ICustomer extends Document {
  userId: mongoose.Types.ObjectId;
  savedPlaces: ISavedPlace[];
  trustedContacts: ITrustedContact[];
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    savedPlaces: [
      {
        name: { type: String, required: true },
        address: { type: String, required: true },
        location: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
          },
        },
      },
    ],
    trustedContacts: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
