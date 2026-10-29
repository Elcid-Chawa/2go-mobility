import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";
import mongoose from "mongoose";
import { MOVER_ADMIN_ROLES, MoverRequest, requireMoverRoles } from "../auth";
import { MoverAgencyModel } from "../models/agency.model";
import { MOVE_TYPES, MoverQuoteModel, MoverRequestModel } from "../models/move.model";
import { MOVER_VEHICLE_TYPES, MoverVehicleModel } from "../models/vehicle.model";
import { moveEndAt, vehicleFitsMove } from "../move.rules";

const router = Router();
const adminRoles = requireMoverRoles(...MOVER_ADMIN_ROLES);
const partnerRole = requireMoverRoles("MOVER_PARTNER");
const customerRole = requireMoverRoles("CUSTOMER");

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

function bodyOf(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    fail(400, "A JSON request body is required.");
  }
  return req.body as Record<string, unknown>;
}

function text(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    fail(400, `${field} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string, maxLength = 1000): string {
  if (value === undefined || value === null || value === "") return "";
  return text(value, field, maxLength);
}

function numeric(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    fail(400, `${field} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function integer(value: unknown, field: string, min: number, max: number): number {
  const parsed = numeric(value, field, min, max);
  if (!Number.isInteger(parsed)) fail(400, `${field} must be a whole number.`);
  return parsed;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) fail(400, `${field} is invalid.`);
  return value as T;
}

function objectId(value: unknown, field: string): mongoose.Types.ObjectId {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) fail(400, `${field} is invalid.`);
  return new mongoose.Types.ObjectId(value);
}

function email(value: unknown): string {
  const result = text(value, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, "email must be valid.");
  return result;
}

function currencyCode(value: unknown): string {
  const currency = text(value, "currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) fail(400, "currency must be a 3-letter code.");
  return currency;
}

function booleanValue(value: unknown, field: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== "boolean") fail(400, `${field} must be true or false.`);
  return value;
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, message: error.message });
  } else if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: error.message });
  } else if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    res.status(409).json({ success: false, message: "A record with these details already exists." });
  } else {
    console.error("Movers request failed", error);
    res.status(500).json({ success: false, message: "The movers request could not be completed." });
  }
}

function endpoint(handler: (req: MoverRequest, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    void handler(req as MoverRequest, res).catch((error: unknown) => sendError(res, error));
  };
}

async function audit(req: MoverRequest, action: string, resourceType: string, resourceId: string, metadata?: unknown) {
  await MoverAuditModel.create({
    actorId: req.actor!.id,
    actorRole: req.actor!.role,
    action,
    resourceType,
    resourceId,
    metadata,
  });
}

async function partnerAgency(req: MoverRequest, approved = true) {
  const agency = await MoverAgencyModel.findOne({ ownerUserId: req.actor!.id });
  if (!agency) fail(404, "Moving agency profile not found. Submit an agency application first.");
  if (approved && agency.status !== "APPROVED") fail(403, "Your moving agency is not approved.");
  return agency;
}

function vehicleDetails(body: Record<string, unknown>) {
  return {
    make: text(body.make, "make", 60),
    model: text(body.model, "model", 60),
    registrationNumber: text(body.registrationNumber, "registrationNumber", 40).toUpperCase(),
    vehicleType: enumValue(body.vehicleType, MOVER_VEHICLE_TYPES, "vehicleType"),
    capacityKg: numeric(body.capacityKg, "capacityKg", 100, 100000),
    volumeM3: numeric(body.volumeM3, "volumeM3", 1, 300),
    crewCapacity: integer(body.crewCapacity, "crewCapacity", 1, 30),
    city: text(body.city, "city", 100),
    description: optionalText(body.description, "description", 1000),
  };
}

async function updateReservation(vehicleId: unknown, moveId: unknown, status: string) {
  const result = await MoverVehicleModel.updateOne(
    { _id: vehicleId, "reservations.moveId": moveId },
    { $set: { "reservations.$.status": status } },
  );
  if (result.matchedCount !== 1) fail(409, "The assigned vehicle reservation could not be updated.");
}

router.post("/agencies/applications", partnerRole, endpoint(async (req, res) => {
  const body = bodyOf(req);
  const agency = await MoverAgencyModel.findOneAndUpdate(
    { ownerUserId: req.actor!.id },
    {
      $set: {
        name: text(body.name, "name", 120),
        registrationNumber: text(body.registrationNumber, "registrationNumber", 80).toUpperCase(),
        email: email(body.email),
        phone: text(body.phone, "phone", 40),
        address: text(body.address, "address", 300),
        city: text(body.city, "city", 100),
        description: optionalText(body.description, "description"),
        status: "PENDING",
        reviewedBy: undefined,
        reviewedAt: undefined,
        reviewNotes: undefined,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await audit(req, "MOVER_AGENCY_APPLICATION_SUBMITTED", "agency", String(agency._id));
  res.status(201).json({ success: true, data: agency });
}));

router.get("/agency/me", partnerRole, endpoint(async (req, res) => {
  res.json({ success: true, data: await partnerAgency(req, false) });
}));

router.get("/vehicles", endpoint(async (req, res) => {
  const filter: Record<string, unknown> = { status: "ACTIVE" };
  if (typeof req.query.city === "string" && req.query.city.trim()) {
    filter.city = { $regex: new RegExp(`^${req.query.city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
  }
  if (typeof req.query.vehicleType === "string" && req.query.vehicleType) {
    filter.vehicleType = enumValue(req.query.vehicleType, MOVER_VEHICLE_TYPES, "vehicleType");
  }
  const vehicles = await MoverVehicleModel.find(filter).select("-reservations").sort({ city: 1, vehicleType: 1 }).lean();
  const agencyIds = [...new Set(vehicles.map((vehicle) => String(vehicle.agencyId)))];
  const agencies = await MoverAgencyModel.find({ _id: { $in: agencyIds }, status: "APPROVED" })
    .select("name city description")
    .lean();
  const agencyMap = new Map(agencies.map((agency) => [String(agency._id), agency]));
  res.json({
    success: true,
    data: vehicles.flatMap((vehicle) => {
      const agency = agencyMap.get(String(vehicle.agencyId));
      return agency ? [{ ...vehicle, agency }] : [];
    }),
  });
}));

router.post("/moves", customerRole, endpoint(async (req, res) => {
  const body = bodyOf(req);
  const scheduledAt = new Date(text(body.scheduledAt, "scheduledAt", 40));
  if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    fail(400, "Choose a valid future move date and time.");
  }
  const move = await MoverRequestModel.create({
    customerUserId: req.actor!.id,
    customerName: req.actor!.name || text(body.customerName, "customerName", 120),
    customerPhone: req.actor!.phone || text(body.customerPhone, "customerPhone", 40),
    pickupAddress: text(body.pickupAddress, "pickupAddress", 300),
    pickupCity: text(body.pickupCity, "pickupCity", 100),
    destinationAddress: text(body.destinationAddress, "destinationAddress", 300),
    destinationCity: text(body.destinationCity, "destinationCity", 100),
    scheduledAt,
    estimatedDurationHours: integer(body.estimatedDurationHours, "estimatedDurationHours", 1, 24),
    moveType: enumValue(body.moveType, MOVE_TYPES, "moveType"),
    bedrooms: integer(body.bedrooms ?? 0, "bedrooms", 0, 20),
    pickupFloor: integer(body.pickupFloor ?? 0, "pickupFloor", 0, 100),
    destinationFloor: integer(body.destinationFloor ?? 0, "destinationFloor", 0, 100),
    pickupElevator: booleanValue(body.pickupElevator, "pickupElevator"),
    destinationElevator: booleanValue(body.destinationElevator, "destinationElevator"),
    crewRequired: integer(body.crewRequired ?? 2, "crewRequired", 1, 30),
    estimatedVolumeM3: numeric(body.estimatedVolumeM3, "estimatedVolumeM3", 1, 300),
    preferredVehicleType: body.preferredVehicleType
      ? enumValue(body.preferredVehicleType, MOVER_VEHICLE_TYPES, "preferredVehicleType")
      : undefined,
    inventoryNotes: optionalText(body.inventoryNotes, "inventoryNotes", 2000),
  });
  await audit(req, "MOVE_REQUEST_CREATED", "move", String(move._id));
  res.status(201).json({ success: true, data: move });
}));

router.get("/moves/me", customerRole, endpoint(async (req, res) => {
  const moves = await MoverRequestModel.find({ customerUserId: req.actor!.id })
    .sort({ createdAt: -1 })
    .lean();
  const ids = moves.map((move) => move._id);
  const quotes = await MoverQuoteModel.find({ moveId: { $in: ids } })
    .populate("agencyId", "name phone city description")
    .populate("vehicleId", "make model registrationNumber vehicleType capacityKg volumeM3 crewCapacity")
    .sort({ amount: 1 })
    .lean();
  const quoteMap = new Map<string, typeof quotes>();
  for (const quote of quotes) {
    const key = String(quote.moveId);
    quoteMap.set(key, [...(quoteMap.get(key) || []), quote]);
  }
  res.json({ success: true, data: moves.map((move) => ({ ...move, quotes: quoteMap.get(String(move._id)) || [] })) });
}));

router.post("/moves/:id/cancel", customerRole, endpoint(async (req, res) => {
  const moveId = objectId(req.params.id, "move id");
  const move = await MoverRequestModel.findOneAndUpdate(
    { _id: moveId, customerUserId: req.actor!.id, status: { $in: ["OPEN", "QUOTED"] } },
    { $set: { status: "CANCELLED" } },
    { new: true },
  );
  if (!move) fail(409, "Only a move awaiting quotes can be cancelled.");
  await MoverQuoteModel.updateMany({ moveId, status: "PROPOSED" }, { $set: { status: "WITHDRAWN" } });
  await audit(req, "MOVE_CANCELLED", "move", String(move._id));
  res.json({ success: true, data: move });
}));

router.post("/moves/:id/quotes/:quoteId/accept", customerRole, endpoint(async (req, res) => {
  const moveId = objectId(req.params.id, "move id");
  const quoteId = objectId(req.params.quoteId, "quote id");
  const move = await MoverRequestModel.findOne({ _id: moveId, customerUserId: req.actor!.id, status: { $in: ["OPEN", "QUOTED"] } });
  if (!move) fail(404, "Move request not found or already assigned.");
  const quote = await MoverQuoteModel.findOne({ _id: quoteId, moveId, status: "PROPOSED", validUntil: { $gt: new Date() } });
  if (!quote) fail(404, "This quote is unavailable or has expired.");
  const endAt = moveEndAt(move.scheduledAt, move.estimatedDurationHours);
  const reservation = await MoverVehicleModel.updateOne(
    {
      _id: quote.vehicleId,
      agencyId: quote.agencyId,
      status: "ACTIVE",
      reservations: {
        $not: {
          $elemMatch: {
            status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
            startAt: { $lt: endAt },
            endAt: { $gt: move.scheduledAt },
          },
        },
      },
    },
    { $push: { reservations: { moveId, startAt: move.scheduledAt, endAt, status: "ASSIGNED" } } },
  );
  if (reservation.modifiedCount !== 1) fail(409, "The vehicle is no longer available for that time.");
  const assignedMove = await MoverRequestModel.findOneAndUpdate(
    { _id: moveId, customerUserId: req.actor!.id, status: { $in: ["OPEN", "QUOTED"] } },
    { $set: { status: "ASSIGNED", acceptedQuoteId: quoteId, agencyId: quote.agencyId, vehicleId: quote.vehicleId } },
    { new: true },
  );
  if (!assignedMove) {
    await MoverVehicleModel.updateOne({ _id: quote.vehicleId }, { $pull: { reservations: { moveId } } });
    fail(409, "Another quote was accepted first. Refresh your move.");
  }
  await Promise.all([
    MoverQuoteModel.updateOne({ _id: quoteId, status: "PROPOSED" }, { $set: { status: "ACCEPTED" } }),
    MoverQuoteModel.updateMany({ moveId, _id: { $ne: quoteId }, status: "PROPOSED" }, { $set: { status: "DECLINED" } }),
  ]);
  await audit(req, "MOVE_QUOTE_ACCEPTED", "move", String(moveId), { quoteId: String(quoteId), agencyId: String(quote.agencyId) });
  res.json({ success: true, data: assignedMove });
}));

router.post("/moves/:id/review", customerRole, endpoint(async (req, res) => {
  const moveId = objectId(req.params.id, "move id");
  const body = bodyOf(req);
  const move = await MoverRequestModel.findOneAndUpdate(
    { _id: moveId, customerUserId: req.actor!.id, status: "COMPLETED", rating: { $exists: false } },
    { $set: { rating: integer(body.rating, "rating", 1, 5), review: optionalText(body.review, "review", 1000) } },
    { new: true, runValidators: true },
  );
  if (!move) fail(409, "Only completed moves can be rated, and each move can be rated once.");
  await audit(req, "MOVE_REVIEW_SUBMITTED", "move", String(moveId), { rating: move.rating });
  res.json({ success: true, data: move });
}));

router.get("/agency/dashboard", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req, false);
  const [vehicles, openRequests, quotes, activeMoves] = await Promise.all([
    MoverVehicleModel.countDocuments({ agencyId: agency._id }),
    MoverRequestModel.countDocuments({ status: { $in: ["OPEN", "QUOTED"] }, scheduledAt: { $gt: new Date() } }),
    MoverQuoteModel.countDocuments({ agencyId: agency._id }),
    MoverRequestModel.countDocuments({ agencyId: agency._id, status: { $in: ["ASSIGNED", "IN_PROGRESS"] } }),
  ]);
  res.json({ success: true, data: { agency, vehicles, openRequests, quotes, activeMoves } });
}));

router.get("/agency/vehicles", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req, false);
  res.json({ success: true, data: await MoverVehicleModel.find({ agencyId: agency._id }).sort({ createdAt: -1 }).lean() });
}));

router.post("/agency/vehicles", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const vehicle = await MoverVehicleModel.create({ ...vehicleDetails(bodyOf(req)), agencyId: agency._id, status: "PENDING" });
  await audit(req, "MOVER_VEHICLE_SUBMITTED", "vehicle", String(vehicle._id));
  res.status(201).json({ success: true, data: vehicle });
}));

router.patch("/agency/vehicles/:id", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const vehicle = await MoverVehicleModel.findOneAndUpdate(
    { _id: objectId(req.params.id, "vehicle id"), agencyId: agency._id },
    { $set: { ...vehicleDetails(bodyOf(req)), status: "PENDING" }, $unset: { reviewNotes: 1 } },
    { new: true, runValidators: true },
  );
  if (!vehicle) fail(404, "Vehicle not found for your agency.");
  await audit(req, "MOVER_VEHICLE_RESUBMITTED", "vehicle", String(vehicle._id));
  res.json({ success: true, data: vehicle });
}));

router.get("/agency/moves", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const moves = await MoverRequestModel.find({
    status: { $in: ["OPEN", "QUOTED"] },
    scheduledAt: { $gt: new Date() },
  }).sort({ scheduledAt: 1 }).lean();
  const ids = moves.map((move) => move._id);
  const [quotes, vehicles] = await Promise.all([
    MoverQuoteModel.find({ moveId: { $in: ids }, agencyId: agency._id }).lean(),
    MoverVehicleModel.find({ agencyId: agency._id, status: "ACTIVE" }).select("_id vehicleType capacityKg volumeM3 crewCapacity").lean(),
  ]);
  const quoteMap = new Map(quotes.map((quote) => [String(quote.moveId), quote]));
  const availableVehicles = vehicles.map((vehicle) => ({ ...vehicle, availableForRequests: true }));
  res.json({
    success: true,
    data: moves.map((move) => ({
      ...move,
      customerName: undefined,
      customerPhone: undefined,
      existingQuote: quoteMap.get(String(move._id)) || null,
      vehicles: availableVehicles.filter((vehicle) => vehicleFitsMove(vehicle, move)),
    })),
  });
}));

router.post("/agency/moves/:id/quotes", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const moveId = objectId(req.params.id, "move id");
  const body = bodyOf(req);
  const move = await MoverRequestModel.findOne({ _id: moveId, status: { $in: ["OPEN", "QUOTED"] }, scheduledAt: { $gt: new Date() } });
  if (!move) fail(404, "This move request is no longer accepting quotes.");
  const vehicleId = objectId(body.vehicleId, "vehicleId");
  const vehicle = await MoverVehicleModel.findOne({ _id: vehicleId, agencyId: agency._id, status: "ACTIVE" });
  if (!vehicle) fail(409, "Choose one of your active, approved vehicles.");
  const crewCount = integer(body.crewCount, "crewCount", move.crewRequired, 30);
  if (!vehicleFitsMove(vehicle, move) || vehicle.crewCapacity < crewCount) {
    fail(400, "The selected vehicle does not meet the customer's vehicle, load, or crew requirements.");
  }
  const endAt = moveEndAt(move.scheduledAt, move.estimatedDurationHours);
  const conflict = await MoverVehicleModel.exists({
    _id: vehicleId,
    reservations: {
      $elemMatch: {
        status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
        startAt: { $lt: endAt },
        endAt: { $gt: move.scheduledAt },
      },
    },
  });
  if (conflict) fail(409, "This vehicle is already assigned during the requested time.");
  const validUntil = new Date(text(body.validUntil, "validUntil", 40));
  if (!Number.isFinite(validUntil.getTime()) || validUntil <= new Date() || validUntil > move.scheduledAt) {
    fail(400, "Quote expiry must be in the future and before the move date.");
  }
  const quote = await MoverQuoteModel.findOneAndUpdate(
    { moveId, agencyId: agency._id, status: { $in: ["PROPOSED", "EXPIRED", "WITHDRAWN"] } },
    {
      $set: {
        vehicleId,
        amount: numeric(body.amount, "amount", 0, 1_000_000_000),
        currency: currencyCode(body.currency),
        crewCount,
        message: optionalText(body.message, "message", 1000),
        validUntil,
        status: "PROPOSED",
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await MoverRequestModel.updateOne({ _id: moveId, status: "OPEN" }, { $set: { status: "QUOTED" } });
  await audit(req, "MOVE_QUOTE_SUBMITTED", "quote", String(quote._id), { moveId: String(moveId), amount: quote.amount });
  res.status(201).json({ success: true, data: quote });
}));

router.patch("/agency/moves/:id/status", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const moveId = objectId(req.params.id, "move id");
  const body = bodyOf(req);
  const status = enumValue(body.status, ["IN_PROGRESS", "COMPLETED"] as const, "status");
  const move = await MoverRequestModel.findOneAndUpdate(
    { _id: moveId, agencyId: agency._id, status: status === "IN_PROGRESS" ? "ASSIGNED" : "IN_PROGRESS" },
    { $set: { status } },
    { new: true },
  );
  if (!move) fail(409, "This move cannot make that status transition.");
  if (status === "IN_PROGRESS") {
    await updateReservation(move.vehicleId, move._id, "IN_PROGRESS");
  } else {
    await updateReservation(move.vehicleId, move._id, "COMPLETED");
  }
  await audit(req, `MOVE_${status}`, "move", String(moveId));
  res.json({ success: true, data: move });
}));

router.get("/agency/assignments", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const data = await MoverRequestModel.find({
    agencyId: agency._id,
    status: { $in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] },
  })
    .populate("vehicleId", "make model registrationNumber vehicleType capacityKg volumeM3")
    .sort({ scheduledAt: 1 })
    .lean();
  res.json({ success: true, data });
}));

router.get("/admin/agencies", adminRoles, endpoint(async (_req, res) => {
  res.json({ success: true, data: await MoverAgencyModel.find().sort({ createdAt: -1 }).lean() });
}));

router.post("/admin/agencies", adminRoles, endpoint(async (req, res) => {
  const body = bodyOf(req);
  const ownerUserId = optionalText(body.ownerUserId, "ownerUserId", 100);
  const agency = await MoverAgencyModel.create({
    ownerUserId: ownerUserId || `ops-managed:${randomUUID()}`,
    name: text(body.name, "name", 120),
    registrationNumber: text(body.registrationNumber, "registrationNumber", 80).toUpperCase(),
    email: email(body.email),
    phone: text(body.phone, "phone", 40),
    address: text(body.address, "address", 300),
    city: text(body.city, "city", 100),
    description: optionalText(body.description, "description"),
    managedByPlatform: !ownerUserId,
    status: "APPROVED",
    reviewedBy: req.actor!.id,
    reviewedAt: new Date(),
  });
  await audit(req, "MOVER_AGENCY_CREATED_BY_OPERATIONS", "agency", String(agency._id));
  res.status(201).json({ success: true, data: agency });
}));

router.patch("/admin/agencies/:id", adminRoles, endpoint(async (req, res) => {
  const body = bodyOf(req);
  const status = enumValue(body.status, ["APPROVED", "REJECTED", "SUSPENDED"] as const, "status");
  const agency = await MoverAgencyModel.findByIdAndUpdate(
    objectId(req.params.id, "agency id"),
    { $set: { status, reviewedBy: req.actor!.id, reviewedAt: new Date(), reviewNotes: optionalText(body.reviewNotes, "reviewNotes") } },
    { new: true, runValidators: true },
  );
  if (!agency) fail(404, "Moving agency not found.");
  await audit(req, `MOVER_AGENCY_${status}`, "agency", String(agency._id));
  res.json({ success: true, data: agency });
}));

router.get("/admin/vehicles", adminRoles, endpoint(async (_req, res) => {
  res.json({
    success: true,
    data: await MoverVehicleModel.find().select("-reservations").populate("agencyId", "name status managedByPlatform").sort({ createdAt: -1 }).lean(),
  });
}));

router.post("/admin/vehicles", adminRoles, endpoint(async (req, res) => {
  const body = bodyOf(req);
  const agencyId = objectId(body.agencyId, "agencyId");
  if (!await MoverAgencyModel.exists({ _id: agencyId, status: "APPROVED" })) fail(409, "Select an approved agency.");
  const vehicle = await MoverVehicleModel.create({ ...vehicleDetails(body), agencyId, status: "ACTIVE" });
  await audit(req, "MOVER_VEHICLE_CREATED_BY_OPERATIONS", "vehicle", String(vehicle._id), { agencyId: String(agencyId) });
  res.status(201).json({ success: true, data: vehicle });
}));

router.patch("/admin/vehicles/:id", adminRoles, endpoint(async (req, res) => {
  const body = bodyOf(req);
  const status = enumValue(body.status, ["ACTIVE", "REJECTED", "MAINTENANCE", "INACTIVE"] as const, "status");
  const vehicle = await MoverVehicleModel.findByIdAndUpdate(
    objectId(req.params.id, "vehicle id"),
    { $set: { status, reviewNotes: optionalText(body.reviewNotes, "reviewNotes") } },
    { new: true, runValidators: true },
  );
  if (!vehicle) fail(404, "Moving vehicle not found.");
  await audit(req, `MOVER_VEHICLE_${status}`, "vehicle", String(vehicle._id));
  res.json({ success: true, data: vehicle });
}));

router.get("/admin/moves", adminRoles, endpoint(async (_req, res) => {
  const data = await MoverRequestModel.find().populate("agencyId", "name phone").populate("vehicleId", "make model registrationNumber vehicleType").sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));

router.post("/admin/moves/:id/quotes", adminRoles, endpoint(async (req, res) => {
  const moveId = objectId(req.params.id, "move id");
  const body = bodyOf(req);
  const move = await MoverRequestModel.findOne({ _id: moveId, status: { $in: ["OPEN", "QUOTED"] }, scheduledAt: { $gt: new Date() } });
  if (!move) fail(404, "This move request is no longer accepting quotes.");
  const agencyId = objectId(body.agencyId, "agencyId");
  if (!await MoverAgencyModel.exists({ _id: agencyId, status: "APPROVED" })) fail(409, "Select an approved agency.");
  const vehicleId = objectId(body.vehicleId, "vehicleId");
  const vehicle = await MoverVehicleModel.findOne({ _id: vehicleId, agencyId, status: "ACTIVE" });
  if (!vehicle) fail(409, "Choose an active vehicle belonging to that agency.");
  const crewCount = integer(body.crewCount, "crewCount", move.crewRequired, 30);
  if (!vehicleFitsMove(vehicle, move) || vehicle.crewCapacity < crewCount) {
    fail(400, "The selected vehicle does not meet the customer's vehicle, load, or crew requirements.");
  }
  const endAt = moveEndAt(move.scheduledAt, move.estimatedDurationHours);
  const conflict = await MoverVehicleModel.exists({
    _id: vehicleId,
    reservations: {
      $elemMatch: {
        status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
        startAt: { $lt: endAt },
        endAt: { $gt: move.scheduledAt },
      },
    },
  });
  if (conflict) fail(409, "This vehicle is already assigned during the requested time.");
  const validUntil = new Date(text(body.validUntil, "validUntil", 40));
  if (!Number.isFinite(validUntil.getTime()) || validUntil <= new Date() || validUntil > move.scheduledAt) {
    fail(400, "Quote expiry must be in the future and before the move date.");
  }
  const quote = await MoverQuoteModel.findOneAndUpdate(
    { moveId, agencyId, status: { $in: ["PROPOSED", "EXPIRED", "WITHDRAWN"] } },
    {
      $set: {
        vehicleId,
        amount: numeric(body.amount, "amount", 0, 1_000_000_000),
        currency: currencyCode(body.currency),
        crewCount,
        message: optionalText(body.message, "message", 1000),
        validUntil,
        status: "PROPOSED",
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await MoverRequestModel.updateOne({ _id: moveId, status: "OPEN" }, { $set: { status: "QUOTED" } });
  await audit(req, "MOVE_QUOTE_SUBMITTED_BY_OPERATIONS", "quote", String(quote._id), {
    moveId: String(moveId),
    agencyId: String(agencyId),
    amount: quote.amount,
  });
  res.status(201).json({ success: true, data: quote });
}));

router.patch("/admin/moves/:id", adminRoles, endpoint(async (req, res) => {
  const body = bodyOf(req);
  const moveId = objectId(req.params.id, "move id");
  if (body.paymentStatus !== undefined) {
    const paymentStatus = enumValue(body.paymentStatus, ["PAID", "FAILED"] as const, "paymentStatus");
    const move = await MoverRequestModel.findOneAndUpdate(
      { _id: moveId, status: "COMPLETED", paymentStatus: { $in: ["PENDING", "FAILED"] } },
      { $set: { paymentStatus, reviewedBy: req.actor!.id, reviewedAt: new Date() } },
      { new: true },
    );
    if (!move) fail(409, "Manual payment can only be recorded for a completed unpaid move.");
    await audit(req, `MOVE_PAYMENT_${paymentStatus}`, "move", String(moveId));
    res.json({ success: true, data: move });
    return;
  }
  const status = enumValue(body.status, ["IN_PROGRESS", "COMPLETED", "CANCELLED"] as const, "status");
  const allowedCurrentStatuses = status === "IN_PROGRESS"
    ? ["ASSIGNED"]
    : status === "COMPLETED"
      ? ["IN_PROGRESS"]
      : ["OPEN", "QUOTED", "ASSIGNED"];
  const move = await MoverRequestModel.findOneAndUpdate(
    { _id: moveId, status: { $in: allowedCurrentStatuses }, paymentStatus: { $ne: "PAID" } },
    { $set: { status, statusNote: optionalText(body.statusNote, "statusNote"), reviewedBy: req.actor!.id, reviewedAt: new Date() } },
    { new: true },
  );
  if (!move) fail(409, "This move cannot make that status transition.");
  if (move.vehicleId && status !== "IN_PROGRESS") {
    await updateReservation(move.vehicleId, move._id, status);
  }
  if (status === "CANCELLED") {
    await MoverQuoteModel.updateMany({ moveId, status: "PROPOSED" }, { $set: { status: "WITHDRAWN" } });
  }
  await audit(req, `MOVE_${status}_BY_OPERATIONS`, "move", String(moveId), { statusNote: move.statusNote });
  res.json({ success: true, data: move });
}));

router.get("/admin/quotes", adminRoles, endpoint(async (_req, res) => {
  const data = await MoverQuoteModel.find()
    .populate("agencyId", "name")
    .populate("vehicleId", "make model registrationNumber vehicleType")
    .populate("moveId", "pickupCity destinationCity scheduledAt status customerName")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data });
}));

export default router;

const auditSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
const MoverAuditModel = mongoose.models.MoverAudit || mongoose.model("MoverAudit", auditSchema);
