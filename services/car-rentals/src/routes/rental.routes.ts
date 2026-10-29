import { randomUUID } from "crypto";
import fs from "fs";
import { Request, Response, Router } from "express";
import mongoose from "mongoose";
import {
  authenticateRentalUser,
  RENTAL_ADMIN_ROLES,
  RentalRequest,
  requireRentalRoles,
} from "../auth";
import { RentalAgencyModel } from "../models/agency.model";
import { RentalAuditModel } from "../models/audit.model";
import { RentalBookingModel } from "../models/booking.model";
import { RentalDriver, RentalDriverModel } from "../models/driver.model";
import { RentalLicenseModel } from "../models/license.model";
import { RentalRateModel } from "../models/rate.model";
import { RENTAL_CATEGORIES, RentalVehicleModel } from "../models/vehicle.model";
import { calculateRentalPrice, RentalPricingError } from "../pricing";
import { decryptDocument, licenseDocumentPath, receiveLicenseDocument, removeLicenseDocument } from "../uploads";

const router = Router();
const adminRoles = requireRentalRoles(...RENTAL_ADMIN_ROLES);
const partnerRole = requireRentalRoles("RENTAL_PARTNER");
const customerRole = requireRentalRoles("CUSTOMER");

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

function text(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    fail(400, `${field} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function requestBody(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    fail(400, "A JSON request body is required.");
  }
  return req.body as Record<string, unknown>;
}

function reviewedUpdate(updates: Record<string, unknown>, body: Record<string, unknown>) {
  const reviewNotes = optionalText(body.reviewNotes, "reviewNotes", 1000);
  return reviewNotes
    ? { $set: { ...updates, reviewNotes } }
    : { $set: updates, $unset: { reviewNotes: 1 } };
}

function optionalText(value: unknown, field: string, maxLength = 1000): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return text(value, field, maxLength);
}

function numberValue(value: unknown, field: string, min = 0, max = 1_000_000): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    fail(400, `${field} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function integerValue(value: unknown, field: string, min: number, max: number): number {
  const parsed = numberValue(value, field, min, max);
  if (!Number.isInteger(parsed)) fail(400, `${field} must be a whole number.`);
  return parsed;
}

function emailValue(value: unknown, field: string): string {
  const email = text(value, field, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, `${field} must be a valid email address.`);
  return email;
}

function currencyValue(value: unknown): string {
  const currency = text(value, "currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) fail(400, "currency must be a 3-letter code.");
  return currency;
}

function photoUrl(value: unknown): string | undefined {
  const url = optionalText(value, "photoUrl", 2000);
  if (!url) return undefined;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    fail(400, "photoUrl must be a valid HTTPS URL.");
  }
  if (parsedUrl.protocol !== "https:") fail(400, "photoUrl must use HTTPS.");
  return url;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(400, `${field} is invalid.`);
  }
  return value as T;
}

function dateValue(value: unknown, field: string): Date {
  if (typeof value !== "string" && !(value instanceof Date)) fail(400, `${field} must be a date.`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) fail(400, `${field} must be a valid date.`);
  return date;
}

function objectId(value: unknown, field: string): mongoose.Types.ObjectId {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) fail(400, `${field} is invalid.`);
  return new mongoose.Types.ObjectId(value);
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof RentalPricingError) {
    res.status(400).json({ success: false, message: error.message });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ success: false, message: error.message });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: error.message });
    return;
  }
  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    res.status(409).json({ success: false, message: "A record with these details already exists." });
    return;
  }
  console.error("Rental request failed", error);
  res.status(500).json({ success: false, message: "The rental request could not be completed." });
}

function endpoint(
  handler: (req: RentalRequest, res: Response) => Promise<void>,
) {
  return (req: Request, res: Response): void => {
    void handler(req as RentalRequest, res).catch((error: unknown) => sendError(res, error));
  };
}

async function partnerAgency(req: RentalRequest, mustBeApproved = true) {
  const agency = await RentalAgencyModel.findOne({ ownerUserId: req.actor!.id });
  if (!agency) fail(404, "Rental agency profile not found. Submit an agency application first.");
  if (mustBeApproved && agency.status !== "APPROVED") fail(403, "Your rental agency is not approved.");
  return agency;
}

function requireApprovedPartnerAgency(req: Request, res: Response, next: () => void): void {
  void partnerAgency(req as RentalRequest)
    .then(() => next())
    .catch((error: unknown) => sendError(res, error));
}

async function audit(req: RentalRequest, action: string, resourceType: string, resourceId: string, metadata?: unknown) {
  await RentalAuditModel.create({
    actorId: req.actor!.id,
    actorRole: req.actor!.role,
    action,
    resourceType,
    resourceId,
    metadata,
  });
}

router.use(authenticateRentalUser);

router.get("/agencies", endpoint(async (_req, res) => {
  const agencies = await RentalAgencyModel.find({ status: "APPROVED" })
    .select("name address description")
    .sort({ name: 1 })
    .lean();
  res.json({ success: true, data: agencies });
}));

router.post("/agencies/applications", partnerRole, endpoint(async (req, res) => {
  const existing = await RentalAgencyModel.findOne({ ownerUserId: req.actor!.id });
  if (existing && existing.status !== "REJECTED") {
    fail(409, "An agency application already exists for this account.");
  }
  const body = requestBody(req);
  const details = {
    name: text(body.name, "name", 120),
    registrationNumber: text(body.registrationNumber, "registrationNumber", 80).toUpperCase(),
    email: emailValue(body.email, "email"),
    phone: text(body.phone, "phone", 40),
    address: text(body.address, "address", 200),
    description: optionalText(body.description, "description", 1000) || "",
    status: "PENDING" as const,
  };
  const agency = existing
    ? await RentalAgencyModel.findOneAndUpdate(
      { _id: existing._id, status: "REJECTED" },
      { $set: details, $unset: { reviewNotes: 1, reviewedBy: 1, reviewedAt: 1 } },
      { new: true, runValidators: true },
    )
    : await RentalAgencyModel.create({ ...details, ownerUserId: req.actor!.id });
  if (!agency) fail(409, "The agency application changed while it was being resubmitted. Refresh and retry.");
  await audit(req, "AGENCY_APPLICATION_SUBMITTED", "agency", String(agency!._id));
  res.status(201).json({ success: true, data: agency });
}));

router.get("/agencies/me", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req, false);
  res.json({ success: true, data: agency });
}));

router.get("/vehicles", endpoint(async (req, res) => {
  const query: Record<string, unknown> = { status: "ACTIVE" };
  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category : "";
  if (city) query.city = { $regex: new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
  if (category) query.category = enumValue(category, RENTAL_CATEGORIES, "category");
  const vehicles = await RentalVehicleModel.find(query).sort({ city: 1, make: 1 }).lean();
  const agencyIds = [...new Set(vehicles.map((vehicle) => String(vehicle.agencyId)))];
  const [agencies, rates] = await Promise.all([
    RentalAgencyModel.find({ _id: { $in: agencyIds }, status: "APPROVED" }).select("name address").lean(),
    RentalRateModel.find({ agencyId: { $in: agencyIds }, status: "ACTIVE" }).lean(),
  ]);
  const agencyMap = new Map(agencies.map((agency) => [String(agency._id), agency]));
  const rateMap = new Map(rates.map((rate) => [`${String(rate.agencyId)}:${rate.category}`, rate]));
  const data = vehicles.flatMap((vehicle) => {
    const agency = agencyMap.get(String(vehicle.agencyId));
    const rate = rateMap.get(`${String(vehicle.agencyId)}:${vehicle.category}`);
    return agency && rate ? [{ ...vehicle, agency, rate }] : [];
  });
  res.json({ success: true, data });
}));

router.post("/licenses/me", customerRole, endpoint(async (req, res) => {
  const body = requestBody(req);
  const expiresAt = dateValue(body.expiresAt, "expiresAt");
  if (expiresAt <= new Date()) fail(400, "Driving licence must not be expired.");
  const existing = await RentalLicenseModel.findOne({ userId: req.actor!.id });
  const oldDocument = existing?.documentFilename;
  const license = await RentalLicenseModel.findOneAndUpdate(
    { userId: req.actor!.id },
    {
      $set: {
        userId: req.actor!.id,
        licenseNumber: text(body.licenseNumber, "licenseNumber", 80).toUpperCase(),
        issuingCountry: text(body.issuingCountry, "issuingCountry", 80),
        expiresAt,
        status: "PENDING",
      },
      $unset: {
        reviewNotes: 1,
        reviewedBy: 1,
        reviewedAt: 1,
        documentFilename: 1,
        documentMimeType: 1,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  if (oldDocument) await removeLicenseDocument(oldDocument);
  await audit(req, "CUSTOMER_LICENSE_SUBMITTED", "license", String(license._id));
  res.status(201).json({ success: true, data: license });
}));

router.post("/licenses/me/document", customerRole, receiveLicenseDocument, endpoint(async (req, res) => {
  const license = await RentalLicenseModel.findOne({ userId: req.actor!.id });
  if (!license || license.expiresAt <= new Date()) {
    await removeLicenseDocument(req.file?.filename);
    fail(409, "Submit a current driving licence before uploading its document.");
  }
  const oldDocument = license.documentFilename;
  license.documentFilename = req.file!.filename;
  license.documentMimeType = req.file!.mimetype;
  license.status = "PENDING";
  license.reviewNotes = undefined;
  license.reviewedBy = undefined;
  license.reviewedAt = undefined;
  try {
    await license.save();
    if (oldDocument) await removeLicenseDocument(oldDocument);
  } catch (error) {
    await removeLicenseDocument(req.file!.filename);
    throw error;
  }
  await audit(req, "CUSTOMER_LICENSE_DOCUMENT_UPLOADED", "license", String(license._id));
  res.status(201).json({ success: true, data: license });
}));

router.get("/licenses/:id/document", endpoint(async (req, res) => {
  const licenseId = objectId(req.params.id, "licence id");
  const license = await RentalLicenseModel.findById(licenseId).lean();
  if (!license) fail(404, "Driving licence record not found.");
  if (req.actor!.role === "CUSTOMER" && license.userId !== req.actor!.id) {
    fail(403, "You cannot access another customer's licence document.");
  }
  if (req.actor!.role !== "CUSTOMER" && !RENTAL_ADMIN_ROLES.includes(req.actor!.role)) {
    fail(403, "You are not allowed to view licence documents.");
  }
  if (!license.documentFilename) fail(404, "No licence document was uploaded.");
  const filePath = licenseDocumentPath(license.documentFilename);
  if (!filePath) fail(404, "Licence document not found.");
  try {
    const encryptedDocument = await fs.promises.readFile(filePath);
    const document = decryptDocument(encryptedDocument);
    res.type(license.documentMimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${license.documentFilename}"`);
    res.send(document);
  } catch (error) {
    sendError(res, error);
  }
}));

router.get("/licenses/me", customerRole, endpoint(async (req, res) => {
  const license = await RentalLicenseModel.findOne({ userId: req.actor!.id }).lean();
  res.json({ success: true, data: license });
}));

router.post("/quotes", customerRole, endpoint(async (req, res) => {
  const body = requestBody(req);
  const vehicleId = objectId(body.vehicleId, "vehicleId");
  const startAt = dateValue(body.startAt, "startAt");
  const endAt = dateValue(body.endAt, "endAt");
  const driverOption = enumValue(body.driverOption || "SELF_DRIVE", ["SELF_DRIVE", "WITH_DRIVER"] as const, "driverOption");
  if (startAt <= new Date() || endAt <= startAt) fail(400, "Rental dates must be in the future and end after they start.");
  const vehicle = await RentalVehicleModel.findOne({ _id: vehicleId, status: "ACTIVE" });
  if (!vehicle) fail(404, "Available rental vehicle not found.");
  const agency = await RentalAgencyModel.findOne({ _id: vehicle.agencyId, status: "APPROVED" });
  const rate = await RentalRateModel.findOne({ agencyId: vehicle.agencyId, category: vehicle.category, status: "ACTIVE" });
  if (!agency || !rate) fail(404, "Approved rental pricing is not available.");
  if (await RentalBookingModel.exists({
    vehicleId,
    status: { $in: ["PENDING_AGENCY", "CONFIRMED"] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  })) fail(409, "This vehicle is already reserved for part of the selected period.");
  if (driverOption === "SELF_DRIVE") {
    const license = await RentalLicenseModel.findOne({ userId: req.actor!.id, status: "VERIFIED", expiresAt: { $gt: endAt } });
    if (!license) fail(403, "A verified driving licence valid through the rental period is required for self-drive.");
  }
  if (driverOption === "WITH_DRIVER") {
    const availableDriver = await RentalDriverModel.findOne({
      agencyId: vehicle.agencyId,
      status: "ACTIVE",
      licenseExpiresAt: { $gt: endAt },
      _id: {
        $nin: await RentalBookingModel.distinct("driverId", {
          driverId: { $exists: true },
          status: { $in: ["PENDING_AGENCY", "CONFIRMED"] },
          startAt: { $lt: endAt },
          endAt: { $gt: startAt },
        }),
      },
    }).select("_id");
    if (!availableDriver) fail(409, "No approved rental driver is available for the selected period.");
  }
  const price = calculateRentalPrice(rate, startAt, endAt, driverOption);
  res.json({ success: true, data: { vehicle, agency, startAt, endAt, driverOption, ...price } });
}));

router.post("/bookings", customerRole, endpoint(async (req, res) => {
  const body = requestBody(req);
  const vehicleId = objectId(body.vehicleId, "vehicleId");
  const startAt = dateValue(body.startAt, "startAt");
  const endAt = dateValue(body.endAt, "endAt");
  const driverOption = enumValue(body.driverOption || "SELF_DRIVE", ["SELF_DRIVE", "WITH_DRIVER"] as const, "driverOption");
  if (startAt <= new Date() || endAt <= startAt) fail(400, "Rental dates must be in the future and end after they start.");
  const vehicle = await RentalVehicleModel.findOne({ _id: vehicleId, status: "ACTIVE" });
  if (!vehicle) fail(404, "Available rental vehicle not found.");
  const agency = await RentalAgencyModel.findOne({ _id: vehicle.agencyId, status: "APPROVED" });
  const rate = await RentalRateModel.findOne({ agencyId: vehicle.agencyId, category: vehicle.category, status: "ACTIVE" });
  if (!agency || !rate) fail(404, "Approved rental pricing is not available.");
  if (driverOption === "SELF_DRIVE") {
    const license = await RentalLicenseModel.findOne({ userId: req.actor!.id, status: "VERIFIED", expiresAt: { $gt: endAt } });
    if (!license) fail(403, "A verified driving licence valid through the rental period is required for self-drive.");
  }
  const price = calculateRentalPrice(rate, startAt, endAt, driverOption);
  const expectedQuote = {
    rentalAmount: numberValue(body.expectedRentalAmount, "expectedRentalAmount"),
    driverAmount: numberValue(body.expectedDriverAmount, "expectedDriverAmount"),
    securityDeposit: numberValue(body.expectedSecurityDeposit, "expectedSecurityDeposit"),
    totalDue: numberValue(body.expectedTotalDue, "expectedTotalDue"),
    currency: currencyValue(body.expectedCurrency),
  };
  if (
    expectedQuote.rentalAmount !== price.rentalAmount ||
    expectedQuote.driverAmount !== price.driverAmount ||
    expectedQuote.securityDeposit !== price.securityDeposit ||
    expectedQuote.totalDue !== price.totalDue ||
    expectedQuote.currency !== price.currency
  ) {
    fail(409, "The rental price changed after your quote. Request a new quote before booking.");
  }
  if (await RentalBookingModel.exists({ vehicleId, status: { $in: ["PENDING_AGENCY", "CONFIRMED"] }, startAt: { $lt: endAt }, endAt: { $gt: startAt } })) {
    fail(409, "This vehicle is already reserved for part of the selected period.");
  }

  const lockToken = randomUUID();
  const lock = await RentalVehicleModel.findOneAndUpdate(
    {
      _id: vehicleId,
      status: "ACTIVE",
      $or: [{ lockExpiresAt: { $lt: new Date() } }, { lockExpiresAt: { $exists: false } }],
    },
    { $set: { lockToken, lockExpiresAt: new Date(Date.now() + 30_000) } },
    { new: true },
  );
  if (!lock) fail(409, "Another booking request is being processed for this vehicle. Please retry.");
  let driver: (RentalDriver & mongoose.Document) | null = null;
  try {
    const overlap = await RentalBookingModel.exists({
      vehicleId,
      status: { $in: ["PENDING_AGENCY", "CONFIRMED"] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
    if (overlap) fail(409, "This vehicle is already reserved for part of the selected period.");
    if (driverOption === "WITH_DRIVER") {
      const candidates = await RentalDriverModel.find({
        agencyId: vehicle.agencyId,
        status: "ACTIVE",
        licenseExpiresAt: { $gt: endAt },
      }).sort({ dailyRate: 1 });
      for (const candidate of candidates) {
        const busy = await RentalBookingModel.exists({
          driverId: candidate._id,
          status: { $in: ["PENDING_AGENCY", "CONFIRMED"] },
          startAt: { $lt: endAt },
          endAt: { $gt: startAt },
        });
        if (!busy) {
          const driverLock = await RentalDriverModel.findOneAndUpdate(
            {
              _id: candidate._id,
              status: "ACTIVE",
              licenseExpiresAt: { $gt: endAt },
              $or: [{ lockExpiresAt: { $lt: new Date() } }, { lockExpiresAt: { $exists: false } }],
            },
            { $set: { lockToken, lockExpiresAt: new Date(Date.now() + 30_000) } },
            { new: true },
          );
          if (driverLock) {
            driver = driverLock;
            break;
          }
        }
      }
      if (!driver) fail(409, "No approved rental driver is available for the selected period.");
    }
    const booking = await RentalBookingModel.create({
      customerId: req.actor!.id,
      agencyId: vehicle.agencyId,
      vehicleId,
      driverId: driver?._id,
      category: vehicle.category,
      driverOption,
      billingUnit: price.billingUnit,
      startAt,
      endAt,
      rentalAmount: price.rentalAmount,
      driverAmount: price.driverAmount,
      securityDeposit: price.securityDeposit,
      totalDue: price.totalDue,
      currency: price.currency,
      customerNote: optionalText(body.customerNote, "customerNote", 1000),
    });
    await audit(req, "RENTAL_BOOKING_CREATED", "booking", String(booking._id), { vehicleId: String(vehicleId) });
    res.status(201).json({ success: true, data: booking });
  } finally {
    await RentalVehicleModel.updateOne({ _id: vehicleId, lockToken }, { $unset: { lockToken: 1, lockExpiresAt: 1 } });
    if (driver) await RentalDriverModel.updateOne({ _id: driver._id, lockToken }, { $unset: { lockToken: 1, lockExpiresAt: 1 } });
  }
}));

router.post("/bookings/:id/cancel", customerRole, endpoint(async (req, res) => {
  const bookingId = objectId(req.params.id, "booking id");
  const booking = await RentalBookingModel.findOneAndUpdate(
    { _id: bookingId, customerId: req.actor!.id, status: "PENDING_AGENCY", paymentStatus: "PENDING" },
    { status: "CANCELLED", statusNote: "Cancelled by customer" },
    { new: true, runValidators: true },
  );
  if (!booking) fail(409, "Only unpaid bookings awaiting agency confirmation can be cancelled in the app.");
  await audit(req, "BOOKING_CANCELLED_BY_CUSTOMER", "booking", String(booking._id));
  res.json({ success: true, data: booking });
}));

router.get("/bookings/me", customerRole, endpoint(async (req, res) => {
  const bookings = await RentalBookingModel.find({ customerId: req.actor!.id })
    .populate("vehicleId", "make model year city photoUrl")
    .populate("agencyId", "name phone")
    .populate("driverId", "name phone")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: bookings });
}));

router.get("/partner/dashboard", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req, false);
  const [vehicles, drivers, rates, bookings] = await Promise.all([
    RentalVehicleModel.countDocuments({ agencyId: agency._id }),
    RentalDriverModel.countDocuments({ agencyId: agency._id }),
    RentalRateModel.countDocuments({ agencyId: agency._id }),
    RentalBookingModel.countDocuments({ agencyId: agency._id, status: { $in: ["PENDING_AGENCY", "CONFIRMED"] } }),
  ]);
  res.json({ success: true, data: { agency, vehicles, drivers, rates, activeBookings: bookings } });
}));

router.get("/partner/vehicles", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req, false);
  const data = await RentalVehicleModel.find({ agencyId: agency._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));

router.post("/partner/vehicles", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const body = requestBody(req);
  const vehicle = await RentalVehicleModel.create({
    agencyId: agency._id,
    make: text(body.make, "make", 60),
    model: text(body.model, "model", 60),
    year: integerValue(body.year, "year", 1990, new Date().getFullYear() + 1),
    registrationNumber: text(body.registrationNumber, "registrationNumber", 40).toUpperCase(),
    vin: text(body.vin, "vin", 40).toUpperCase(),
    category: enumValue(body.category, RENTAL_CATEGORIES, "category"),
    seats: integerValue(body.seats, "seats", 2, 30),
    transmission: enumValue(body.transmission, ["AUTOMATIC", "MANUAL"] as const, "transmission"),
    fuel: enumValue(body.fuel, ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const, "fuel"),
    city: text(body.city, "city", 100),
    description: optionalText(body.description, "description", 2000) || "",
    photoUrl: photoUrl(body.photoUrl),
  });
  await audit(req, "RENTAL_VEHICLE_SUBMITTED", "vehicle", String(vehicle._id));
  res.status(201).json({ success: true, data: vehicle });
}));

router.patch("/partner/vehicles/:id", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const vehicleId = objectId(req.params.id, "vehicle id");
  const body = requestBody(req);
  const updates: Record<string, unknown> = {};
  if (body.make !== undefined) updates.make = text(body.make, "make", 60);
  if (body.model !== undefined) updates.model = text(body.model, "model", 60);
  if (body.year !== undefined) updates.year = integerValue(body.year, "year", 1990, new Date().getFullYear() + 1);
  if (body.registrationNumber !== undefined) updates.registrationNumber = text(body.registrationNumber, "registrationNumber", 40).toUpperCase();
  if (body.vin !== undefined) updates.vin = text(body.vin, "vin", 40).toUpperCase();
  if (body.category !== undefined) updates.category = enumValue(body.category, RENTAL_CATEGORIES, "category");
  if (body.seats !== undefined) updates.seats = integerValue(body.seats, "seats", 2, 30);
  if (body.transmission !== undefined) updates.transmission = enumValue(body.transmission, ["AUTOMATIC", "MANUAL"] as const, "transmission");
  if (body.fuel !== undefined) updates.fuel = enumValue(body.fuel, ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const, "fuel");
  if (body.city !== undefined) updates.city = text(body.city, "city", 100);
  if (body.description !== undefined) updates.description = optionalText(body.description, "description", 2000) || "";
  if (body.photoUrl !== undefined) updates.photoUrl = photoUrl(body.photoUrl);
  if (!Object.keys(updates).length) fail(400, "Provide at least one editable vehicle field.");
  updates.status = "PENDING";
  const vehicle = await RentalVehicleModel.findOneAndUpdate(
    { _id: vehicleId, agencyId: agency._id },
    { $set: updates, $unset: { reviewNotes: 1 } },
    { new: true, runValidators: true },
  );
  if (!vehicle) fail(404, "Vehicle not found for your agency.");
  await audit(req, "RENTAL_VEHICLE_RESUBMITTED", "vehicle", String(vehicle._id));
  res.json({ success: true, data: vehicle });
}));

router.get("/partner/drivers", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req, false);
  const data = await RentalDriverModel.find({ agencyId: agency._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));

router.post("/partner/drivers", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const body = requestBody(req);
  const licenseExpiresAt = dateValue(body.licenseExpiresAt, "licenseExpiresAt");
  if (licenseExpiresAt <= new Date()) fail(400, "Driver licence must not be expired.");
  const driver = await RentalDriverModel.create({
    agencyId: agency._id,
    name: text(body.name, "name", 120),
    phone: text(body.phone, "phone", 40),
    email: body.email === undefined || body.email === "" ? undefined : emailValue(body.email, "email"),
    licenseNumber: text(body.licenseNumber, "licenseNumber", 80).toUpperCase(),
    licenseExpiresAt,
    dailyRate: numberValue(body.dailyRate, "dailyRate"),
  });
  await audit(req, "RENTAL_DRIVER_SUBMITTED", "driver", String(driver._id));
  res.status(201).json({ success: true, data: driver });
}));

router.patch("/partner/drivers/:id", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const driverId = objectId(req.params.id, "driver id");
  const body = requestBody(req);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = text(body.name, "name", 120);
  if (body.phone !== undefined) updates.phone = text(body.phone, "phone", 40);
  if (body.email !== undefined) updates.email = body.email === "" ? undefined : emailValue(body.email, "email");
  if (body.licenseNumber !== undefined) updates.licenseNumber = text(body.licenseNumber, "licenseNumber", 80).toUpperCase();
  if (body.licenseExpiresAt !== undefined) {
    const expiresAt = dateValue(body.licenseExpiresAt, "licenseExpiresAt");
    if (expiresAt <= new Date()) fail(400, "Driver licence must not be expired.");
    updates.licenseExpiresAt = expiresAt;
  }
  if (body.dailyRate !== undefined) updates.dailyRate = numberValue(body.dailyRate, "dailyRate");
  if (!Object.keys(updates).length) fail(400, "Provide at least one editable driver field.");
  const licenseChanged = body.licenseNumber !== undefined || body.licenseExpiresAt !== undefined;
  const existing = licenseChanged
    ? await RentalDriverModel.findOne({ _id: driverId, agencyId: agency._id }).select("+documentFilename")
    : null;
  updates.status = "PENDING";
  const driver = await RentalDriverModel.findOneAndUpdate(
    { _id: driverId, agencyId: agency._id },
    {
      $set: updates,
      $unset: {
        reviewNotes: 1,
        ...(licenseChanged ? { documentFilename: 1, documentMimeType: 1 } : {}),
      },
    },
    { new: true, runValidators: true },
  );
  if (!driver) fail(404, "Driver not found for your agency.");
  if (existing?.documentFilename) await removeLicenseDocument(existing.documentFilename);
  await audit(req, "RENTAL_DRIVER_RESUBMITTED", "driver", String(driver._id));
  res.json({ success: true, data: driver });
}));

router.post("/partner/drivers/:id/license-document", partnerRole, requireApprovedPartnerAgency, receiveLicenseDocument, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const driverId = objectId(req.params.id, "driver id");
  const driver = await RentalDriverModel.findOne({ _id: driverId, agencyId: agency._id });
  if (!driver || driver.licenseExpiresAt <= new Date()) {
    await removeLicenseDocument(req.file?.filename);
    fail(409, "A current driver record is required before uploading its licence.");
  }
  const oldDocument = driver.documentFilename;
  driver.documentFilename = req.file!.filename;
  driver.documentMimeType = req.file!.mimetype;
  driver.status = "PENDING";
  driver.reviewNotes = undefined;
  try {
    await driver.save();
    if (oldDocument) await removeLicenseDocument(oldDocument);
  } catch (error) {
    await removeLicenseDocument(req.file!.filename);
    throw error;
  }
  await audit(req, "RENTAL_DRIVER_LICENSE_UPLOADED", "driver", String(driver._id));
  res.status(201).json({ success: true, data: driver });
}));

router.get("/partner/rates", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req, false);
  const data = await RentalRateModel.find({ agencyId: agency._id }).sort({ category: 1 }).lean();
  res.json({ success: true, data });
}));

router.post("/partner/rates", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const body = requestBody(req);
  const rate = await RentalRateModel.create({
    agencyId: agency._id,
    category: enumValue(body.category, RENTAL_CATEGORIES, "category"),
    currency: currencyValue(body.currency),
    hourlyRate: numberValue(body.hourlyRate, "hourlyRate"),
    dailyRate: numberValue(body.dailyRate, "dailyRate"),
    weeklyRate: numberValue(body.weeklyRate, "weeklyRate"),
    minimumHours: integerValue(body.minimumHours ?? 24, "minimumHours", 1, 168),
    securityDeposit: numberValue(body.securityDeposit, "securityDeposit"),
    chauffeurDailyRate: numberValue(body.chauffeurDailyRate ?? 0, "chauffeurDailyRate"),
  });
  await audit(req, "RENTAL_RATE_SUBMITTED", "rate", String(rate._id));
  res.status(201).json({ success: true, data: rate });
}));

router.patch("/partner/rates/:id", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const rateId = objectId(req.params.id, "rate id");
  const body = requestBody(req);
  const updates: Record<string, unknown> = {};
  if (body.category !== undefined) updates.category = enumValue(body.category, RENTAL_CATEGORIES, "category");
  if (body.currency !== undefined) updates.currency = currencyValue(body.currency);
  for (const field of ["hourlyRate", "dailyRate", "weeklyRate", "securityDeposit", "chauffeurDailyRate"] as const) {
    if (body[field] !== undefined) updates[field] = numberValue(body[field], field);
  }
  if (body.minimumHours !== undefined) updates.minimumHours = integerValue(body.minimumHours, "minimumHours", 1, 168);
  if (!Object.keys(updates).length) fail(400, "Provide at least one editable rate field.");
  updates.status = "PENDING";
  const rate = await RentalRateModel.findOneAndUpdate(
    { _id: rateId, agencyId: agency._id },
    { $set: updates, $unset: { reviewNotes: 1, reviewedBy: 1, reviewedAt: 1 } },
    { new: true, runValidators: true },
  );
  if (!rate) fail(404, "Rate not found for your agency.");
  await audit(req, "RENTAL_RATE_RESUBMITTED", "rate", String(rate._id));
  res.json({ success: true, data: rate });
}));

router.get("/partner/bookings", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req, false);
  const data = await RentalBookingModel.find({ agencyId: agency._id })
    .populate("vehicleId", "make model registrationNumber")
    .populate("driverId", "name phone")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data });
}));

router.patch("/partner/bookings/:id", partnerRole, endpoint(async (req, res) => {
  const agency = await partnerAgency(req);
  const bookingId = objectId(req.params.id, "booking id");
  const body = requestBody(req);
  const status = enumValue(body.status, ["CONFIRMED", "DECLINED"] as const, "status");
  const booking = await RentalBookingModel.findOneAndUpdate(
    { _id: bookingId, agencyId: agency._id, status: "PENDING_AGENCY" },
    {
      status,
      statusNote: optionalText(body.statusNote, "statusNote", 1000),
      reviewedBy: req.actor!.id,
      reviewedAt: new Date(),
    },
    { new: true, runValidators: true },
  );
  if (!booking) fail(404, "Pending booking not found for your agency.");
  await audit(req, `BOOKING_${status}`, "booking", String(booking._id));
  res.json({ success: true, data: booking });
}));

router.get("/admin/agencies", adminRoles, endpoint(async (_req, res) => {
  const data = await RentalAgencyModel.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));

router.post("/admin/agencies", adminRoles, endpoint(async (req, res) => {
  const body = requestBody(req);
  const ownerUserId = optionalText(body.ownerUserId, "ownerUserId", 100);
  const managedByPlatform = !ownerUserId;
  const agency = await RentalAgencyModel.create({
    ownerUserId: ownerUserId || `ops-managed:${randomUUID()}`,
    name: text(body.name, "name", 120),
    registrationNumber: text(body.registrationNumber, "registrationNumber", 80).toUpperCase(),
    email: emailValue(body.email, "email"),
    phone: text(body.phone, "phone", 40),
    address: text(body.address, "address", 300),
    description: optionalText(body.description, "description", 1000) || "",
    managedByPlatform,
    status: "APPROVED",
    reviewedBy: req.actor!.id,
    reviewedAt: new Date(),
  });
  await audit(req, "AGENCY_CREATED_BY_OPERATIONS", "agency", String(agency._id), {
    managedByPlatform,
  });
  res.status(201).json({ success: true, data: agency });
}));

router.patch("/admin/agencies/:id", adminRoles, endpoint(async (req, res) => {
  const agencyId = objectId(req.params.id, "agency id");
  const body = requestBody(req);
  const status = enumValue(body.status, ["APPROVED", "REJECTED", "SUSPENDED"] as const, "status");
  const agency = await RentalAgencyModel.findByIdAndUpdate(
    agencyId,
    reviewedUpdate({ status, reviewedBy: req.actor!.id, reviewedAt: new Date() }, body),
    { new: true, runValidators: true },
  );
  if (!agency) fail(404, "Rental agency not found.");
  await audit(req, `AGENCY_${status}`, "agency", String(agency._id), { reviewNotes: agency.reviewNotes });
  res.json({ success: true, data: agency });
}));

router.get("/admin/vehicles", adminRoles, endpoint(async (_req, res) => {
  const data = await RentalVehicleModel.find().populate("agencyId", "name status").sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));

router.post("/admin/vehicles", adminRoles, endpoint(async (req, res) => {
  const body = requestBody(req);
  const agencyId = objectId(body.agencyId, "agencyId");
  const agency = await RentalAgencyModel.findOne({ _id: agencyId, status: "APPROVED" });
  if (!agency) fail(409, "Select an approved rental agency before adding inventory.");
  const vehicle = await RentalVehicleModel.create({
    agencyId,
    make: text(body.make, "make", 60),
    model: text(body.model, "model", 60),
    year: integerValue(body.year, "year", 1990, new Date().getFullYear() + 1),
    registrationNumber: text(body.registrationNumber, "registrationNumber", 40).toUpperCase(),
    vin: text(body.vin, "vin", 40).toUpperCase(),
    category: enumValue(body.category, RENTAL_CATEGORIES, "category"),
    seats: integerValue(body.seats, "seats", 2, 30),
    transmission: enumValue(body.transmission, ["AUTOMATIC", "MANUAL"] as const, "transmission"),
    fuel: enumValue(body.fuel, ["PETROL", "DIESEL", "HYBRID", "ELECTRIC"] as const, "fuel"),
    city: text(body.city, "city", 100),
    description: optionalText(body.description, "description", 2000) || "",
    photoUrl: photoUrl(body.photoUrl),
    status: "ACTIVE",
  });
  await audit(req, "RENTAL_VEHICLE_CREATED_BY_OPERATIONS", "vehicle", String(vehicle._id), {
    agencyId: String(agencyId),
  });
  res.status(201).json({ success: true, data: vehicle });
}));

router.patch("/admin/vehicles/:id", adminRoles, endpoint(async (req, res) => {
  const vehicleId = objectId(req.params.id, "vehicle id");
  const body = requestBody(req);
  const status = enumValue(body.status, ["ACTIVE", "REJECTED", "MAINTENANCE", "INACTIVE"] as const, "status");
  const vehicle = await RentalVehicleModel.findByIdAndUpdate(
    vehicleId,
    reviewedUpdate({ status }, body),
    { new: true, runValidators: true },
  );
  if (!vehicle) fail(404, "Rental vehicle not found.");
  await audit(req, `VEHICLE_${status}`, "vehicle", String(vehicle._id));
  res.json({ success: true, data: vehicle });
}));

router.get("/admin/drivers", adminRoles, endpoint(async (_req, res) => {
  const data = await RentalDriverModel.find().populate("agencyId", "name status").sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));

router.patch("/admin/drivers/:id", adminRoles, endpoint(async (req, res) => {
  const driverId = objectId(req.params.id, "driver id");
  const body = requestBody(req);
  const status = enumValue(body.status, ["ACTIVE", "REJECTED", "INACTIVE"] as const, "status");
  if (status === "ACTIVE") {
    const candidate = await RentalDriverModel.findById(driverId).select("+documentFilename");
    if (!candidate || candidate.licenseExpiresAt <= new Date() || !candidate.documentFilename) {
      fail(409, "A current driver licence document must be uploaded before approval.");
    }
  }
  const driver = await RentalDriverModel.findByIdAndUpdate(
    driverId,
    reviewedUpdate({ status }, body),
    { new: true, runValidators: true },
  );
  if (!driver) fail(404, "Rental driver not found.");
  await audit(req, `DRIVER_${status}`, "driver", String(driver._id));
  res.json({ success: true, data: driver });
}));

router.get("/admin/drivers/:id/license-document", adminRoles, endpoint(async (req, res) => {
  const driverId = objectId(req.params.id, "driver id");
  const driver = await RentalDriverModel.findById(driverId).lean();
  if (!driver?.documentFilename) fail(404, "Driver licence document not found.");
  const filePath = licenseDocumentPath(driver.documentFilename);
  if (!filePath) fail(404, "Driver licence document not found.");
  try {
    const encryptedDocument = await fs.promises.readFile(filePath);
    const document = decryptDocument(encryptedDocument);
    res.type(driver.documentMimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${driver.documentFilename}"`);
    res.send(document);
  } catch (error) {
    sendError(res, error);
  }
}));

router.get("/admin/rates", adminRoles, endpoint(async (_req, res) => {
  const data = await RentalRateModel.find().populate("agencyId", "name status").sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));

router.post("/admin/rates", adminRoles, endpoint(async (req, res) => {
  const body = requestBody(req);
  const agencyId = objectId(body.agencyId, "agencyId");
  const agency = await RentalAgencyModel.findOne({ _id: agencyId, status: "APPROVED" });
  if (!agency) fail(409, "Select an approved rental agency before setting prices.");
  const rate = await RentalRateModel.create({
    agencyId,
    category: enumValue(body.category, RENTAL_CATEGORIES, "category"),
    currency: currencyValue(body.currency),
    hourlyRate: numberValue(body.hourlyRate, "hourlyRate"),
    dailyRate: numberValue(body.dailyRate, "dailyRate"),
    weeklyRate: numberValue(body.weeklyRate, "weeklyRate"),
    minimumHours: integerValue(body.minimumHours, "minimumHours", 1, 168),
    securityDeposit: numberValue(body.securityDeposit, "securityDeposit"),
    chauffeurDailyRate: numberValue(body.chauffeurDailyRate, "chauffeurDailyRate"),
    status: "ACTIVE",
    reviewedBy: req.actor!.id,
    reviewedAt: new Date(),
  });
  await audit(req, "RENTAL_RATE_CREATED_BY_OPERATIONS", "rate", String(rate._id), {
    agencyId: String(agencyId),
    category: rate.category,
  });
  res.status(201).json({ success: true, data: rate });
}));

router.patch("/admin/rates/:id", adminRoles, endpoint(async (req, res) => {
  const rateId = objectId(req.params.id, "rate id");
  const body = requestBody(req);
  const status = enumValue(body.status, ["ACTIVE", "REJECTED"] as const, "status");
  const rate = await RentalRateModel.findByIdAndUpdate(
    rateId,
    reviewedUpdate({ status, reviewedBy: req.actor!.id, reviewedAt: new Date() }, body),
    { new: true, runValidators: true },
  );
  if (!rate) fail(404, "Rental rate not found.");
  await audit(req, `RATE_${status}`, "rate", String(rate._id));
  res.json({ success: true, data: rate });
}));

router.get("/admin/licenses", adminRoles, endpoint(async (_req, res) => {
  const data = await RentalLicenseModel.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
}));

router.patch("/admin/licenses/:id", adminRoles, endpoint(async (req, res) => {
  const licenseId = objectId(req.params.id, "licence id");
  const body = requestBody(req);
  const status = enumValue(body.status, ["VERIFIED", "REJECTED"] as const, "status");
  const currentLicense = await RentalLicenseModel.findOne({
    _id: licenseId,
    expiresAt: { $gt: new Date() },
  });
  if (!currentLicense) fail(404, "Current rental licence not found.");
  if (status === "VERIFIED" && !currentLicense.documentFilename) {
    fail(409, "A licence document must be uploaded before verification.");
  }
  const license = await RentalLicenseModel.findOneAndUpdate(
    {
      _id: licenseId,
      expiresAt: { $gt: new Date() },
      ...(status === "VERIFIED" ? { documentFilename: currentLicense.documentFilename } : {}),
    },
    reviewedUpdate({ status, reviewedBy: req.actor!.id, reviewedAt: new Date() }, body),
    { new: true, runValidators: true },
  );
  if (!license) fail(409, "The driving licence changed while it was being reviewed. Reload and retry.");
  await audit(req, `LICENSE_${status}`, "license", String(license._id));
  res.json({ success: true, data: license });
}));

router.get("/admin/bookings", adminRoles, endpoint(async (_req, res) => {
  const data = await RentalBookingModel.find()
    .populate("agencyId", "name phone")
    .populate("vehicleId", "make model registrationNumber")
    .populate("driverId", "name phone")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data });
}));

router.patch("/admin/bookings/:id", adminRoles, endpoint(async (req, res) => {
  const bookingId = objectId(req.params.id, "booking id");
  const body = requestBody(req);
  const updates: Record<string, unknown> = {};
  const filter: Record<string, unknown> = { _id: bookingId };
  const existing = await RentalBookingModel.findById(bookingId);
  if (!existing) fail(404, "Rental booking not found.");
  if (body.paymentStatus !== undefined && body.status !== undefined) {
    fail(400, "Update payment and booking status separately.");
  }
  if (body.paymentStatus !== undefined) {
    const paymentStatus = enumValue(body.paymentStatus, ["PAID", "FAILED"] as const, "paymentStatus");
    if (existing.status !== "CONFIRMED" || !["PENDING", "FAILED"].includes(existing.paymentStatus)) {
      fail(409, "Manual payment can only be recorded for a confirmed booking that has not been paid.");
    }
    filter.status = "CONFIRMED";
    filter.paymentStatus = { $in: ["PENDING", "FAILED"] };
    updates.paymentStatus = paymentStatus;
  }
  if (body.status !== undefined) {
    updates.status = enumValue(body.status, ["COMPLETED", "CANCELLED"] as const, "status");
    if (updates.status === "COMPLETED") {
      if (existing.endAt > new Date() || existing.status !== "CONFIRMED" || existing.paymentStatus !== "PAID") {
        fail(409, "Only paid, confirmed bookings that have ended can be completed.");
      }
      filter.status = "CONFIRMED";
      filter.paymentStatus = "PAID";
      filter.endAt = { $lte: new Date() };
    } else if (existing.paymentStatus === "PAID") {
      fail(409, "A paid booking cannot be cancelled without a refund workflow.");
    } else {
      filter.status = { $in: ["PENDING_AGENCY", "CONFIRMED"] };
      filter.paymentStatus = { $ne: "PAID" };
    }
  }
  if (!Object.keys(updates).length) fail(400, "No supported booking update was provided.");
  const statusNote = optionalText(body.statusNote, "statusNote", 1000);
  if (statusNote) updates.statusNote = statusNote;
  updates.reviewedBy = req.actor!.id;
  updates.reviewedAt = new Date();
  const booking = await RentalBookingModel.findOneAndUpdate(filter, { $set: updates }, { new: true, runValidators: true });
  if (!booking) fail(409, "The booking status changed while this update was being applied. Reload and retry.");
  await audit(req, "BOOKING_ADMIN_UPDATED", "booking", String(booking._id), updates);
  res.json({ success: true, data: booking });
}));

export default router;
