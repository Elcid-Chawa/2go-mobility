import mongoose, { Schema } from "mongoose";
import { RentalCategory } from "./vehicle.model";

export type BookingStatus = "PENDING_AGENCY" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type DriverOption = "SELF_DRIVE" | "WITH_DRIVER";
export type BillingUnit = "HOURLY" | "DAILY" | "WEEKLY";

export interface RentalBooking {
  customerId: string;
  agencyId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  category: RentalCategory;
  driverOption: DriverOption;
  billingUnit: BillingUnit;
  startAt: Date;
  endAt: Date;
  rentalAmount: number;
  driverAmount: number;
  securityDeposit: number;
  totalDue: number;
  currency: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  customerNote?: string;
  statusNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<RentalBooking>(
  {
    customerId: { type: String, required: true, index: true },
    agencyId: { type: Schema.Types.ObjectId, ref: "RentalAgency", required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "RentalVehicle", required: true, index: true },
    driverId: { type: Schema.Types.ObjectId, ref: "RentalDriver" },
    category: { type: String, required: true },
    driverOption: { type: String, enum: ["SELF_DRIVE", "WITH_DRIVER"], required: true },
    billingUnit: { type: String, enum: ["HOURLY", "DAILY", "WEEKLY"], required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    rentalAmount: { type: Number, required: true, min: 0 },
    driverAmount: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, required: true, min: 0 },
    totalDue: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    status: { type: String, enum: ["PENDING_AGENCY", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED"], default: "PENDING_AGENCY", index: true },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED", "REFUNDED"], default: "PENDING", index: true },
    customerNote: { type: String, trim: true, maxlength: 1000 },
    statusNote: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);
bookingSchema.index({ vehicleId: 1, startAt: 1, endAt: 1, status: 1 });
bookingSchema.index({ driverId: 1, startAt: 1, endAt: 1, status: 1 });

export const RentalBookingModel = mongoose.model<RentalBooking>("RentalBooking", bookingSchema);
