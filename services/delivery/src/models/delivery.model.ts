import mongoose, { Document, Schema } from "mongoose";

export const DELIVERY_PACKAGE_TYPES = ["DOCUMENT", "SMALL", "MEDIUM", "LARGE"] as const;
export const DELIVERY_STATUSES = [
  "REQUESTED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

export type DeliveryPackageType = (typeof DELIVERY_PACKAGE_TYPES)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface DeliveryOrderDocument extends Document {
  customerId: string;
  customerName: string;
  customerPhone: string;
  recipientName: string;
  recipientPhone: string;
  pickupAddress: string;
  pickupCoordinates: [number, number];
  destinationAddress: string;
  destinationCoordinates: [number, number];
  packageType: DeliveryPackageType;
  packageDescription: string;
  weightKg: number;
  fragile: boolean;
  notes: string;
  estimatedDistanceKm: number;
  estimatedFare: number;
  currency: string;
  status: DeliveryStatus;
  driverId?: string;
  driverProfileId?: string;
  driverName?: string;
  driverPhone?: string;
  driverLocation?: { coordinates: [number, number]; updatedAt: Date };
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  paymentMethod?: "CASH" | "MOBILE_MONEY";
  paymentHistory: Array<{
    status: "PAID" | "FAILED";
    method: "CASH" | "MOBILE_MONEY";
    amount: number;
    currency: string;
    actorId: string;
    actorRole: string;
    createdAt: Date;
  }>;
  rating?: { score: number; comment: string; createdAt: Date };
  statusHistory: Array<{ status: DeliveryStatus; actorId: string; actorRole: string; note: string; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const historySchema = new Schema(
  {
    status: { type: String, enum: DELIVERY_STATUSES, required: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    note: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const paymentHistorySchema = new Schema(
  {
    status: { type: String, enum: ["PAID", "FAILED"], required: true },
    method: { type: String, enum: ["CASH", "MOBILE_MONEY"], required: true },
    amount: { type: Number, min: 0, required: true },
    currency: { type: String, required: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const deliveryOrderSchema = new Schema<DeliveryOrderDocument>(
  {
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    recipientName: { type: String, required: true },
    recipientPhone: { type: String, required: true },
    pickupAddress: { type: String, required: true },
    pickupCoordinates: { type: [Number], required: true },
    destinationAddress: { type: String, required: true },
    destinationCoordinates: { type: [Number], required: true },
    packageType: { type: String, enum: DELIVERY_PACKAGE_TYPES, required: true },
    packageDescription: { type: String, required: true },
    weightKg: { type: Number, min: 0.1, max: 100, required: true },
    fragile: { type: Boolean, default: false },
    notes: { type: String, default: "" },
    estimatedDistanceKm: { type: Number, required: true },
    estimatedFare: { type: Number, required: true },
    currency: { type: String, required: true, default: "RWF" },
    status: { type: String, enum: DELIVERY_STATUSES, required: true, default: "REQUESTED", index: true },
    driverId: { type: String, index: true },
    driverProfileId: String,
    driverName: String,
    driverPhone: String,
    driverLocation: {
      coordinates: { type: [Number] },
      updatedAt: Date,
    },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },
    paymentMethod: { type: String, enum: ["CASH", "MOBILE_MONEY"] },
    paymentHistory: { type: [paymentHistorySchema], default: [] },
    rating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
      createdAt: Date,
    },
    statusHistory: { type: [historySchema], default: [] },
  },
  { timestamps: true },
);

deliveryOrderSchema.index({ customerId: 1, createdAt: -1 });
deliveryOrderSchema.index({ driverId: 1, status: 1 });
deliveryOrderSchema.index({ status: 1, createdAt: -1 });

export const DeliveryOrderModel =
  mongoose.models.DeliveryOrder ||
  mongoose.model<DeliveryOrderDocument>("DeliveryOrder", deliveryOrderSchema);

export interface DeliveryPricingDocument extends Document {
  key: string;
  baseFee: number;
  perKmRate: number;
  perKgRate: number;
  roadFactor: number;
  currency: string;
  updatedBy: string;
  updatedAt: Date;
}

const deliveryPricingSchema = new Schema<DeliveryPricingDocument>(
  {
    key: { type: String, unique: true, default: "default" },
    baseFee: { type: Number, min: 0, required: true, default: 1000 },
    perKmRate: { type: Number, min: 0, required: true, default: 300 },
    perKgRate: { type: Number, min: 0, required: true, default: 100 },
    roadFactor: { type: Number, min: 1, max: 3, required: true, default: 1.25 },
    currency: { type: String, required: true, default: "RWF" },
    updatedBy: { type: String, default: "system" },
  },
  { timestamps: true },
);

export const DeliveryPricingModel =
  mongoose.models.DeliveryPricing ||
  mongoose.model<DeliveryPricingDocument>("DeliveryPricing", deliveryPricingSchema);
