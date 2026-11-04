import { Request, Response, Router } from "express";
import mongoose from "mongoose";
import { DELIVERY_OPERATIONS_ROLES, DeliveryRequest, requireDeliveryRoles } from "../auth";
import { DeliveryOrderModel, DeliveryPricingModel, DELIVERY_PACKAGE_TYPES, DELIVERY_STATUSES, DeliveryStatus } from "../models/delivery.model";
import { calculateDeliveryEstimate } from "../pricing";
import { env } from "../config/env";

const router = Router();
const customerRole = requireDeliveryRoles("CUSTOMER");
const driverRole = requireDeliveryRoles("DRIVER");
const operationsRole = requireDeliveryRoles(...DELIVERY_OPERATIONS_ROLES);
const readOperationsRole = requireDeliveryRoles(...DELIVERY_OPERATIONS_ROLES, "AGENT", "VIEWER");

interface CentralDriver {
  _id?: string;
  userId?: { _id?: string; name?: string; phone?: string; status?: string };
  approvalStatus?: string;
  onlineStatus?: string;
  availabilityStatus?: string;
  activeVehicleId?: { status?: string };
}

export const healthHandler = (_req: Request, res: Response): void => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    service: "delivery",
    status: databaseConnected ? "UP" : "DEGRADED",
    database: databaseConnected ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
};

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

function optionalText(value: unknown, field: string, maxLength = 500): string {
  if (value === undefined || value === null || value === "") return "";
  return text(value, field, maxLength);
}

function numberBetween(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    fail(400, `${field} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function coordinatePair(value: unknown, field: string): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    fail(400, `${field} must contain longitude and latitude.`);
  }
  const longitude = numberBetween(value[0], `${field} longitude`, -180, 180);
  const latitude = numberBetween(value[1], `${field} latitude`, -90, 90);
  return [longitude, latitude];
}

function actor(req: Request): DeliveryRequest["actor"] {
  return (req as DeliveryRequest).actor;
}

function deliveryError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, message: error.message });
  } else if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: error.message });
  } else if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    res.status(409).json({ success: false, message: "A conflicting delivery record already exists." });
  } else {
    console.error("Delivery request failed", error);
    res.status(500).json({ success: false, message: "The delivery request could not be completed." });
  }
}

function endpoint(handler: (req: DeliveryRequest, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    void handler(req as DeliveryRequest, res).catch((error: unknown) => deliveryError(res, error));
  };
}

async function getPricing() {
  const pricing = await DeliveryPricingModel.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default", baseFee: 1000, perKmRate: 300, perKgRate: 100, roadFactor: 1.25, currency: "RWF", updatedBy: "system" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return pricing;
}

async function setCentralDriverLock(
  req: DeliveryRequest,
  driverId: string,
  deliveryId: string,
  action: "LOCK" | "RELEASE",
): Promise<void> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${env.AUTH_API_URL}/admin/drivers/${driverId}/delivery-lock`, {
      method: "PATCH",
      headers: {
        Authorization: req.headers.authorization || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deliveryId, action }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("Unable to reach central driver availability service", error);
    fail(503, "Unable to update driver delivery availability.");
  }
  const result = await response.json().catch(() => ({})) as { message?: string; success?: boolean };
  if (!response.ok || result.success === false) {
    console.error("Unable to update central driver delivery availability", response.status, result.message);
    const status = response.status >= 400 && response.status < 500 ? response.status : 503;
    fail(status, result.message || "Unable to update driver delivery availability.");
  }
}

async function getCentralDrivers(req: DeliveryRequest): Promise<CentralDriver[]> {
  let response: globalThis.Response;
  try {
    response = await fetch(`${env.AUTH_API_URL}/admin/drivers`, {
      headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {},
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("Unable to reach the identity service for delivery drivers", error);
    fail(503, "Unable to load available drivers.");
  }
  if (!response.ok) {
    console.error("Identity service returned an unexpected driver-list status", response.status);
    fail(response.status === 401 || response.status === 403 ? response.status : 503, "Unable to load available drivers.");
  }
  const result = await response.json().catch(() => ({})) as { success?: boolean; data?: unknown };
  if (!result.success || !Array.isArray(result.data)) fail(503, "Identity service returned an invalid driver list.");
  return result.data as CentralDriver[];
}

function estimateFor(body: Record<string, unknown>, pricing: Awaited<ReturnType<typeof getPricing>>) {
  const pickup = coordinatePair(body.pickupCoordinates, "pickupCoordinates");
  const destination = coordinatePair(body.destinationCoordinates, "destinationCoordinates");
  const weightKg = numberBetween(body.weightKg, "weightKg", 0.1, 100);
  return calculateDeliveryEstimate(pickup, destination, weightKg, pricing);
}

router.post("/pricing/estimate", customerRole, endpoint(async (req, res) => {
  const pricing = await getPricing();
  const estimate = estimateFor(bodyOf(req), pricing);
  res.json({ success: true, data: { ...estimate, baseFee: pricing.baseFee, perKmRate: pricing.perKmRate, perKgRate: pricing.perKgRate } });
}));

router.post("/orders", customerRole, endpoint(async (req, res) => {
  const currentActor = actor(req)!;
  const body = bodyOf(req);
  const pricing = await getPricing();
  const pickupCoordinates = coordinatePair(body.pickupCoordinates, "pickupCoordinates");
  const destinationCoordinates = coordinatePair(body.destinationCoordinates, "destinationCoordinates");
  const weightKg = numberBetween(body.weightKg, "weightKg", 0.1, 100);
  const packageType = text(body.packageType, "packageType", 20);
  if (!(DELIVERY_PACKAGE_TYPES as readonly string[]).includes(packageType)) fail(400, "packageType is invalid.");
  if (typeof body.fragile !== "boolean") fail(400, "fragile must be true or false.");
  const estimate = calculateDeliveryEstimate(pickupCoordinates, destinationCoordinates, weightKg, pricing);
  const order = await DeliveryOrderModel.create({
    customerId: currentActor.id,
    customerName: currentActor.name,
    customerPhone: currentActor.phone || "",
    recipientName: text(body.recipientName, "recipientName", 120),
    recipientPhone: text(body.recipientPhone, "recipientPhone", 40),
    pickupAddress: text(body.pickupAddress, "pickupAddress", 300),
    pickupCoordinates,
    destinationAddress: text(body.destinationAddress, "destinationAddress", 300),
    destinationCoordinates,
    packageType,
    packageDescription: text(body.packageDescription, "packageDescription", 300),
    weightKg,
    fragile: body.fragile,
    notes: optionalText(body.notes, "notes"),
    estimatedDistanceKm: estimate.distanceKm,
    estimatedFare: estimate.fare,
    currency: estimate.currency,
    status: "REQUESTED",
    paymentStatus: "PENDING",
    statusHistory: [{ status: "REQUESTED", actorId: currentActor.id, actorRole: currentActor.role, note: "Delivery requested" }],
  });
  res.status(201).json({ success: true, data: order });
}));

router.get("/orders/mine", customerRole, endpoint(async (req, res) => {
  const orders = await DeliveryOrderModel.find({ customerId: actor(req)!.id }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: orders });
}));

router.patch("/orders/:id/cancel", customerRole, endpoint(async (req, res) => {
  const currentActor = actor(req)!;
  const order = await DeliveryOrderModel.findOneAndUpdate({
    _id: req.params.id,
    customerId: currentActor.id,
    status: "REQUESTED",
  }, {
    $set: { status: "CANCELLED" },
    $push: { statusHistory: { status: "CANCELLED", actorId: currentActor.id, actorRole: currentActor.role, note: "Cancelled by customer", createdAt: new Date() } },
  }, { new: true });
  if (!order) fail(409, "Only an unassigned delivery can be cancelled.");
  res.json({ success: true, data: order });
}));

router.post("/orders/:id/rating", customerRole, endpoint(async (req, res) => {
  const currentActor = actor(req)!;
  const body = bodyOf(req);
  const score = numberBetween(body.score, "score", 1, 5);
  if (!Number.isInteger(score)) fail(400, "score must be a whole number from 1 to 5.");
  const order = await DeliveryOrderModel.findOneAndUpdate({
    _id: req.params.id,
    customerId: currentActor.id,
    status: "DELIVERED",
    rating: { $exists: false },
  }, {
    $set: { rating: { score, comment: optionalText(body.comment, "comment"), createdAt: new Date() } },
  }, { new: true, runValidators: true });
  if (!order) fail(409, "This delivery cannot be rated or has already been rated.");
  res.json({ success: true, data: order });
}));

router.get("/orders/:id", customerRole, endpoint(async (req, res) => {
  const order = await DeliveryOrderModel.findOne({ _id: req.params.id, customerId: actor(req)!.id });
  if (!order) fail(404, "Delivery was not found.");
  res.json({ success: true, data: order });
}));

router.get("/driver/orders", driverRole, endpoint(async (req, res) => {
  const orders = await DeliveryOrderModel.find({ driverId: actor(req)!.id, status: { $in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } })
    .sort({ updatedAt: -1 })
    .limit(50);
  res.json({ success: true, data: orders });
}));

router.patch("/driver/orders/:id/status", driverRole, endpoint(async (req, res) => {
  const currentActor = actor(req)!;
  const body = bodyOf(req);
  const nextStatus = text(body.status, "status", 20) as DeliveryStatus;
  if (!(DELIVERY_STATUSES as readonly string[]).includes(nextStatus)) fail(400, "status is invalid.");
  const expectedStatus =
    nextStatus === "PICKED_UP" ? "ASSIGNED" :
      nextStatus === "IN_TRANSIT" ? "PICKED_UP" :
        nextStatus === "DELIVERED" ? "IN_TRANSIT" : undefined;
  if (!expectedStatus) fail(400, "The requested status is not a driver action.");
  const order = await DeliveryOrderModel.findOneAndUpdate(
    { _id: req.params.id, driverId: currentActor.id, status: expectedStatus },
    {
      $set: { status: nextStatus },
      $push: { statusHistory: { status: nextStatus, actorId: currentActor.id, actorRole: currentActor.role, note: "Updated by delivery driver", createdAt: new Date() } },
    },
    { new: true, runValidators: true },
  );
  if (!order) fail(409, "Delivery was not assigned to you or the status has already changed.");
  if (nextStatus === "DELIVERED" && order.driverProfileId) {
    await setCentralDriverLock(req, order.driverProfileId, String(order._id), "RELEASE");
  }
  res.json({ success: true, data: order });
}));

router.post("/driver/orders/:id/location", driverRole, endpoint(async (req, res) => {
  const currentActor = actor(req)!;
  const coordinates = coordinatePair(bodyOf(req).coordinates, "coordinates");
  const query = {
    _id: req.params.id,
    driverId: currentActor.id,
    status: { $in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
  };
  const updatedAt = new Date();
  const cutoff = new Date(updatedAt.getTime() - 10000);
  const order = await DeliveryOrderModel.findOneAndUpdate(
    {
      ...query,
      $or: [
        { "driverLocation.updatedAt": { $exists: false } },
        { "driverLocation.updatedAt": { $lte: cutoff } },
      ],
    },
    { $set: { driverLocation: { coordinates, updatedAt } } },
    { new: true },
  );
  if (!order) {
    const activeOrder = await DeliveryOrderModel.exists(query);
    if (!activeOrder) fail(404, "Active assigned delivery was not found.");
    fail(429, "Location updates are limited to one every 10 seconds.");
  }
  res.json({ success: true, data: { updatedAt: order.driverLocation.updatedAt } });
}));

router.get("/admin/pricing", readOperationsRole, endpoint(async (_req, res) => {
  res.json({ success: true, data: await getPricing() });
}));

router.patch("/admin/pricing", operationsRole, endpoint(async (req, res) => {
  const body = bodyOf(req);
  const baseFee = numberBetween(body.baseFee, "baseFee", 0, 100000000);
  const perKmRate = numberBetween(body.perKmRate, "perKmRate", 0, 10000000);
  const perKgRate = numberBetween(body.perKgRate, "perKgRate", 0, 10000000);
  const roadFactor = numberBetween(body.roadFactor, "roadFactor", 1, 3);
  const currency = text(body.currency, "currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) fail(400, "currency must be a 3-letter code.");
  const pricing = await DeliveryPricingModel.findOneAndUpdate(
    { key: "default" },
    { $set: { baseFee, perKmRate, perKgRate, roadFactor, currency, updatedBy: actor(req)!.id } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.json({ success: true, data: pricing });
}));

router.get("/admin/drivers", readOperationsRole, endpoint(async (req, res) => {
  res.json({ success: true, data: await getCentralDrivers(req) });
}));

router.get("/admin/summary", readOperationsRole, endpoint(async (_req, res) => {
  const [total, active, delivered, unpaid, revenue] = await Promise.all([
    DeliveryOrderModel.countDocuments(),
    DeliveryOrderModel.countDocuments({ status: { $in: ["REQUESTED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } }),
    DeliveryOrderModel.countDocuments({ status: "DELIVERED" }),
    DeliveryOrderModel.countDocuments({ status: "DELIVERED", paymentStatus: { $ne: "PAID" } }),
    DeliveryOrderModel.aggregate([{ $match: { paymentStatus: "PAID" } }, { $group: { _id: "$currency", amount: { $sum: "$estimatedFare" } } }]),
  ]);
  res.json({ success: true, data: { total, active, delivered, unpaid, revenue } });
}));

router.get("/admin/orders", readOperationsRole, endpoint(async (req, res) => {
  const status = req.query.status;
  if (status !== undefined && (typeof status !== "string" || !(DELIVERY_STATUSES as readonly string[]).includes(status))) fail(400, "status filter is invalid.");
  const query = typeof status === "string" ? { status } : {};
  const orders = await DeliveryOrderModel.find(query).sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, data: orders });
}));

router.patch("/admin/orders/:id/assign", operationsRole, endpoint(async (req, res) => {
  const currentActor = actor(req)!;
  const body = bodyOf(req);
  const driverId = text(body.driverId, "driverId", 100);
  if (!mongoose.isValidObjectId(driverId)) fail(400, "driverId is invalid.");
  const driver = (await getCentralDrivers(req)).find((item) => item.userId?._id === driverId);
  if (!driver || driver.approvalStatus !== "APPROVED" || driver.userId?.status !== "ACTIVE" ||
      driver.onlineStatus !== "ONLINE" || driver.availabilityStatus !== "AVAILABLE" ||
      driver.activeVehicleId?.status !== "ACTIVE") {
    fail(409, "Select an approved, active, online, and available driver.");
  }
  const previous = await DeliveryOrderModel.findById(req.params.id);
  if (!previous || !["REQUESTED", "ASSIGNED"].includes(previous.status)) {
    fail(409, "Only a requested or already-assigned delivery can be assigned.");
  }
  const previousDriverId = previous.driverId;
  const previousDriverProfileId = previous.driverProfileId;
  if (!driver._id) fail(503, "Identity service returned a driver without a profile ID.");
  await setCentralDriverLock(req, driver._id, String(previous._id), "LOCK");
  let order;
  try {
    order = await DeliveryOrderModel.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["REQUESTED", "ASSIGNED"] } },
      {
        $set: { driverId, driverProfileId: driver._id, driverName: driver.userId.name || "2Go delivery partner", driverPhone: driver.userId.phone || "", status: "ASSIGNED" },
        $push: { statusHistory: { status: "ASSIGNED", actorId: currentActor.id, actorRole: currentActor.role, note: "Assigned by Operations", createdAt: new Date() } },
      },
      { new: true, runValidators: true },
    );
    if (!order) fail(409, "This delivery changed before the driver could be assigned.");
  } catch (error) {
    if (previousDriverId !== driverId) {
      await setCentralDriverLock(req, driver._id, String(previous._id), "RELEASE");
    }
    throw error;
  }
  if (previousDriverId && previousDriverId !== driverId && previousDriverProfileId) {
    await setCentralDriverLock(req, previousDriverProfileId, String(previous._id), "RELEASE");
  }
  res.json({ success: true, data: order });
}));

router.patch("/admin/orders/:id/status", operationsRole, endpoint(async (req, res) => {
  const currentActor = actor(req)!;
  const body = bodyOf(req);
  const nextStatus = text(body.status, "status", 20) as DeliveryStatus;
  const note = optionalText(body.note, "note");
  if (nextStatus !== "CANCELLED" || !note) fail(400, "Operations may only cancel deliveries with a reason.");
  const order = await DeliveryOrderModel.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["REQUESTED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT"] } },
    {
      $set: { status: "CANCELLED" },
      $push: { statusHistory: { status: "CANCELLED", actorId: currentActor.id, actorRole: currentActor.role, note, createdAt: new Date() } },
    },
    { new: true },
  );
  if (!order) fail(409, "This delivery can no longer be cancelled.");
  if (order.driverProfileId) await setCentralDriverLock(req, order.driverProfileId, String(order._id), "RELEASE");
  res.json({ success: true, data: order });
}));

router.patch("/admin/orders/:id/release-driver", operationsRole, endpoint(async (req, res) => {
  const order = await DeliveryOrderModel.findOne({
    _id: req.params.id,
    status: { $in: ["DELIVERED", "CANCELLED"] },
  });
  if (!order) fail(409, "The delivery must be delivered or cancelled before releasing its driver.");
  if (order.driverProfileId) {
    await setCentralDriverLock(req, order.driverProfileId, String(order._id), "RELEASE");
  }
  res.json({ success: true, data: order });
}));

router.patch("/admin/orders/:id/payment", operationsRole, endpoint(async (req, res) => {
  const currentActor = actor(req)!;
  const body = bodyOf(req);
  const paymentStatus = text(body.paymentStatus, "paymentStatus", 20);
  if (paymentStatus !== "PAID" && paymentStatus !== "FAILED") fail(400, "paymentStatus must be PAID or FAILED.");
  const paymentMethod = text(body.paymentMethod, "paymentMethod", 20);
  if (paymentMethod !== "CASH" && paymentMethod !== "MOBILE_MONEY") fail(400, "paymentMethod is invalid.");
  const existing = await DeliveryOrderModel.findById(req.params.id);
  if (!existing || existing.status !== "DELIVERED") fail(409, "Payment can only be recorded for a delivered parcel.");
  if (existing.paymentStatus === "PAID" && paymentStatus === "PAID") {
    res.json({ success: true, data: existing });
    return;
  }
  const order = await DeliveryOrderModel.findOneAndUpdate(
    { _id: req.params.id, status: "DELIVERED", paymentStatus: { $ne: "PAID" } },
    {
      $set: { paymentStatus, paymentMethod },
      $push: {
        paymentHistory: {
          status: paymentStatus,
          method: paymentMethod,
          amount: existing.estimatedFare,
          currency: existing.currency,
          actorId: currentActor.id,
          actorRole: currentActor.role,
          createdAt: new Date(),
        },
      },
    },
    { new: true },
  );
  if (!order) {
    const alreadyPaid = await DeliveryOrderModel.findOne({
      _id: req.params.id,
      status: "DELIVERED",
      paymentStatus: "PAID",
    });
    if (alreadyPaid && paymentStatus === "PAID") {
      res.json({ success: true, data: alreadyPaid });
      return;
    }
    fail(409, "Payment can only be recorded for a delivered parcel and paid records cannot be changed.");
  }
  res.json({ success: true, data: order });
}));

export default router;
