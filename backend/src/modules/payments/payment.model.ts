import mongoose, { Document, Schema } from "mongoose";
import { PaymentMethod, PaymentStatus } from "../../constants/tripStatus";

export interface IPayment extends Document {
  tripId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: string;
  providerReference?: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "RWF",
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CASH,
    },
    provider: {
      type: String,
      default: "CASH_PROVIDER",
    },
    providerReference: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
