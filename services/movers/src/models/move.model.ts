import mongoose, { Schema } from "mongoose";
import { MOVER_VEHICLE_TYPES, MoverVehicleType } from "./vehicle.model";

export const MOVE_TYPES = ["HOUSEHOLD", "OFFICE", "SINGLE_ITEM"] as const;
export type MoveType = (typeof MOVE_TYPES)[number];
export const MOVE_STATUSES = ["OPEN", "QUOTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type MoveStatus = (typeof MOVE_STATUSES)[number];
export const MOVE_QUOTE_STATUSES = ["PROPOSED", "ACCEPTED", "DECLINED", "WITHDRAWN", "EXPIRED"] as const;
export type MoveQuoteStatus = (typeof MOVE_QUOTE_STATUSES)[number];

const moveSchema = new Schema(
  {
    customerUserId: { type: String, required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    pickupAddress: { type: String, required: true, trim: true, maxlength: 300 },
    pickupCity: { type: String, required: true, trim: true, maxlength: 100 },
    destinationAddress: { type: String, required: true, trim: true, maxlength: 300 },
    destinationCity: { type: String, required: true, trim: true, maxlength: 100 },
    scheduledAt: { type: Date, required: true, index: true },
    estimatedDurationHours: { type: Number, required: true, min: 1, max: 24 },
    moveType: { type: String, enum: MOVE_TYPES, required: true },
    bedrooms: { type: Number, required: true, min: 0, max: 20, default: 0 },
    pickupFloor: { type: Number, required: true, min: 0, max: 100, default: 0 },
    destinationFloor: { type: Number, required: true, min: 0, max: 100, default: 0 },
    pickupElevator: { type: Boolean, default: false },
    destinationElevator: { type: Boolean, default: false },
    crewRequired: { type: Number, required: true, min: 1, max: 30, default: 2 },
    estimatedVolumeM3: { type: Number, required: true, min: 1, max: 300, default: 15 },
    preferredVehicleType: { type: String, enum: MOVER_VEHICLE_TYPES },
    inventoryNotes: { type: String, default: "", trim: true, maxlength: 2000 },
    status: { type: String, enum: MOVE_STATUSES, default: "OPEN", index: true },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },
    acceptedQuoteId: { type: Schema.Types.ObjectId, ref: "MoverQuote" },
    agencyId: { type: Schema.Types.ObjectId, ref: "MoverAgency" },
    vehicleId: { type: Schema.Types.ObjectId, ref: "MoverVehicle" },
    statusNote: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);
moveSchema.index({ status: 1, scheduledAt: 1 });
moveSchema.index({ agencyId: 1, status: 1, scheduledAt: 1 });

const quoteSchema = new Schema(
  {
    moveId: { type: Schema.Types.ObjectId, ref: "MoverRequest", required: true, index: true },
    agencyId: { type: Schema.Types.ObjectId, ref: "MoverAgency", required: true, index: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: "MoverVehicle", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    crewCount: { type: Number, required: true, min: 1, max: 30 },
    message: { type: String, default: "", trim: true, maxlength: 1000 },
    validUntil: { type: Date, required: true },
    status: { type: String, enum: MOVE_QUOTE_STATUSES, default: "PROPOSED", index: true },
  },
  { timestamps: true },
);
quoteSchema.index({ moveId: 1, agencyId: 1 }, { unique: true });

export const MoverRequestModel = mongoose.model("MoverRequest", moveSchema);
export const MoverQuoteModel = mongoose.model("MoverQuote", quoteSchema);
