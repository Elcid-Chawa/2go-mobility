import mongoose, { Schema } from "mongoose";

export const MOVER_VEHICLE_TYPES = ["PICKUP", "SMALL_VAN", "MEDIUM_TRUCK", "LARGE_TRUCK", "FLATBED"] as const;
export type MoverVehicleType = (typeof MOVER_VEHICLE_TYPES)[number];
export type MoverVehicleStatus = "PENDING" | "ACTIVE" | "REJECTED" | "MAINTENANCE" | "INACTIVE";
export type MoverReservationStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const reservationSchema = new Schema(
  {
    moveId: { type: Schema.Types.ObjectId, ref: "MoverRequest", required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: { type: String, enum: ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"], required: true },
  },
  { _id: false },
);

const vehicleSchema = new Schema(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: "MoverAgency", required: true, index: true },
    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    registrationNumber: { type: String, required: true, trim: true, uppercase: true },
    vehicleType: { type: String, enum: MOVER_VEHICLE_TYPES, required: true, index: true },
    capacityKg: { type: Number, required: true, min: 100, max: 100000 },
    volumeM3: { type: Number, required: true, min: 1, max: 300 },
    crewCapacity: { type: Number, required: true, min: 1, max: 30 },
    city: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    photoUrl: { type: String, trim: true },
    status: { type: String, enum: ["PENDING", "ACTIVE", "REJECTED", "MAINTENANCE", "INACTIVE"], default: "PENDING", index: true },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
    reservations: { type: [reservationSchema], default: [] },
  },
  { timestamps: true },
);
vehicleSchema.index({ registrationNumber: 1 }, { unique: true });

export const MoverVehicleModel = mongoose.model("MoverVehicle", vehicleSchema);
