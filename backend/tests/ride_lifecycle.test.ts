import request from "supertest";
import { createApp } from "../src/app";
import { setupTestDB } from "./setup";
import { UserRole, UserStatus } from "../src/constants/roles";
import {
  DriverOnlineStatus,
  DriverAvailabilityStatus,
  TripStatus,
  DriverApprovalStatus,
} from "../src/constants/tripStatus";
import { VehicleCategory, VehicleStatus } from "../src/constants/vehicleCategory";
import { PricingRule } from "../src/modules/pricing/pricing.model";
import { Driver } from "../src/modules/drivers/driver.model";
import { Vehicle } from "../src/modules/vehicles/vehicle.model";
import { User } from "../src/modules/users/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";

setupTestDB();

const app = createApp();

async function createAdminToken(): Promise<string> {
  const passwordHash = await bcrypt.hash("adminPassword123", 10);
  const admin = await User.create({
    name: "Ops Admin",
    email: "admin@2go.internal",
    phone: "+1888000111",
    passwordHash,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  });
  return jwt.sign(
    {
      userId: admin._id.toString(),
      role: UserRole.ADMIN,
      email: admin.email,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" },
  );
}

async function activateTestDriver(
  driverProfileId: string,
  registrationNumber: string,
  vin: string,
): Promise<void> {
  const driver = await Driver.findByIdAndUpdate(
    driverProfileId,
    { approvalStatus: DriverApprovalStatus.APPROVED },
    { new: true },
  );
  if (!driver) {
    throw new Error("Test driver profile was not created");
  }
  const vehicle = await Vehicle.create({
    driverId: driver._id,
    registrationNumber,
    vin,
    make: "Test",
    model: "Vehicle",
    year: 2024,
    color: "Blue",
    category: VehicleCategory.STANDARD,
    status: VehicleStatus.ACTIVE,
  });
  driver.activeVehicleId = vehicle._id;
  await driver.save();
}

describe("2GO Full Ride-Hailing Vertical Slice Lifecycle E2E", () => {
  it("should successfully execute entire ride lifecycle: Auth -> Online -> Estimate -> Dispatch -> Arrive -> Start -> Stream -> Complete -> Pay -> Rate -> Ops Dashboard", async () => {
    // 0. Seed pricing rules
    await PricingRule.create({
      category: VehicleCategory.STANDARD,
      baseFare: 2.5,
      pricePerKm: 1.2,
      pricePerMinute: 0.25,
      minimumFare: 5.0,
      surgeMultiplier: 1.0,
      isActive: true,
    });

    // 1. Register Admin, Customer, and Driver
    const adminToken = await createAdminToken();

    const custReg = await request(app).post("/api/v1/auth/register").send({
      name: "Alice Rider",
      email: "alice.rider@example.com",
      phone: "+1888000222",
      password: "riderPassword123",
      role: UserRole.CUSTOMER,
    });
    expect(custReg.status).toBe(201);
    const customerToken = custReg.body.data.tokens.accessToken;

    const driverReg = await request(app).post("/api/v1/auth/register").send({
      name: "Bob Chauffeur",
      email: "bob.driver@example.com",
      phone: "+1888000333",
      password: "driverPassword123",
      role: UserRole.DRIVER,
      licenseNumber: "DL-NY-102938",
    });
    expect(driverReg.status).toBe(201);
    const driverToken = driverReg.body.data.tokens.accessToken;
    const driverProfileId = driverReg.body.data.profileId;
    await activateTestDriver(
      driverProfileId,
      "TEST-VEHICLE-001",
      "TEST-VIN-00000000001",
    );

    // 2. Driver goes online and reports GPS position
    const statusRes = await request(app)
      .patch("/api/v1/drivers/me/status")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        onlineStatus: DriverOnlineStatus.ONLINE,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.onlineStatus).toBe(DriverOnlineStatus.ONLINE);

    const locRes = await request(app)
      .post("/api/v1/drivers/me/location")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        coordinates: [-73.9855, 40.7485],
        heading: 90,
      });
    expect(locRes.status).toBe(200);
    expect(locRes.body.data.currentLocation.coordinates).toEqual([
      -73.9855, 40.7485,
    ]);

    // 3. Customer checks fare estimate
    const estRes = await request(app)
      .post("/api/v1/pricing/estimate")
      .send({
        pickup: {
          coordinates: [-73.9851, 40.7488],
          address: "Empire State Building",
        },
        destination: {
          coordinates: [-73.9818, 40.7533],
          address: "Grand Central Terminal",
        },
        category: VehicleCategory.STANDARD,
      });
    expect(estRes.status).toBe(200);
    expect(estRes.body.data.estimatedFare).toBeGreaterThanOrEqual(5.0);

    // 4. Customer requests ride and dispatch matches driver
    const tripRes = await request(app)
      .post("/api/v1/trips")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        pickup: {
          coordinates: [-73.9851, 40.7488],
          address: "Empire State Building",
        },
        destination: {
          coordinates: [-73.9818, 40.7533],
          address: "Grand Central Terminal",
        },
        category: VehicleCategory.STANDARD,
      });
    expect(tripRes.status).toBe(201);
    const tripId = tripRes.body.data._id;

    // Allow async dispatch loop tick
    await new Promise((resolve) => setTimeout(resolve, 150));

    const tripDetails = await request(app)
      .get(`/api/v1/trips/${tripId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(tripDetails.status).toBe(200);
    expect(tripDetails.body.data.status).toBe(TripStatus.DRIVER_ASSIGNED);
    expect(tripDetails.body.data.driverId._id).toBe(driverProfileId);

    const driverActiveRide = await request(app)
      .get("/api/v1/trips/active")
      .set("Authorization", `Bearer ${driverToken}`);
    expect(driverActiveRide.status).toBe(200);
    expect(driverActiveRide.body.data._id).toBe(tripId);
    expect(driverActiveRide.body.data.status).toBe(TripStatus.DRIVER_ASSIGNED);

    const customerActiveRide = await request(app)
      .get("/api/v1/trips/active")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(customerActiveRide.status).toBe(200);
    expect(customerActiveRide.body.data._id).toBe(tripId);

    // 5. Driver accepts trip (and duplicate acceptance is prevented)
    const acceptRes = await request(app)
      .post(`/api/v1/trips/${tripId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe(TripStatus.DRIVER_ACCEPTED);

    const dupAcceptRes = await request(app)
      .post(`/api/v1/trips/${tripId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);
    expect(dupAcceptRes.status).toBe(409);

    // 6. Driver arrives, starts trip, and streams GPS location breadcrumbs
    const arriveRes = await request(app)
      .post(`/api/v1/trips/${tripId}/arrive`)
      .set("Authorization", `Bearer ${driverToken}`);
    expect(arriveRes.status).toBe(200);
    expect(arriveRes.body.data.status).toBe(TripStatus.DRIVER_ARRIVED);

    const startRes = await request(app)
      .post(`/api/v1/trips/${tripId}/start`)
      .set("Authorization", `Bearer ${driverToken}`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe(TripStatus.TRIP_STARTED);

    const breadcrumbRes = await request(app)
      .post(`/api/v1/trips/${tripId}/location`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        coordinates: [-73.9835, 40.751],
        heading: 45,
        speed: 32,
      });
    expect(breadcrumbRes.status).toBe(200);

    // 7. Driver completes trip, records cash payment, and customer rates driver
    const completeRes = await request(app)
      .post(`/api/v1/trips/${tripId}/complete`)
      .set("Authorization", `Bearer ${driverToken}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe(TripStatus.TRIP_COMPLETED);

    const payRes = await request(app)
      .post(`/api/v1/trips/${tripId}/payment`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({ method: "CASH" });
    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe("PAID");

    const rateRes = await request(app)
      .post(`/api/v1/trips/${tripId}/rating`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        score: 5,
        comment: "Fantastic driving experience!",
      });
    expect(rateRes.status).toBe(201);
    expect(rateRes.body.data.score).toBe(5);

    const historyRes = await request(app)
      .get("/api/v1/trips/history")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data).toHaveLength(1);
    expect(historyRes.body.data[0]._id).toBe(tripId);

    // Duplicate rating is rejected
    const dupRateRes = await request(app)
      .post(`/api/v1/trips/${tripId}/rating`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ score: 4 });
    expect(dupRateRes.status).toBe(409);

    // 8. Operations Admin checks dashboard metrics and trip list
    const kpiRes = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(kpiRes.status).toBe(200);
    expect(kpiRes.body.data.totalTrips).toBe(1);
    expect(kpiRes.body.data.totalRevenue).toBeGreaterThan(0);

    const adminTripsRes = await request(app)
      .get("/api/v1/admin/trips")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminTripsRes.status).toBe(200);
    expect(adminTripsRes.body.data.length).toBe(1);
    expect(adminTripsRes.body.data[0].status).toBe(TripStatus.RATED);
  });

  it("should reject unauthorized trip access and invalid trip state transitions", async () => {
    await PricingRule.create({
      category: VehicleCategory.STANDARD,
      baseFare: 2.5,
      pricePerKm: 1.2,
      pricePerMinute: 0.25,
      minimumFare: 5.0,
      surgeMultiplier: 1.0,
      isActive: true,
    });

    const customerA = await request(app).post("/api/v1/auth/register").send({
      name: "Customer A",
      email: "customer.a@example.com",
      phone: "+15550000001",
      password: "Password123",
      role: UserRole.CUSTOMER,
    });

    const customerB = await request(app).post("/api/v1/auth/register").send({
      name: "Customer B",
      email: "customer.b@example.com",
      phone: "+15550000002",
      password: "Password123",
      role: UserRole.CUSTOMER,
    });

    const driver = await request(app).post("/api/v1/auth/register").send({
      name: "Driver One",
      email: "driver.one@example.com",
      phone: "+15550000003",
      password: "Password123",
      role: UserRole.DRIVER,
      licenseNumber: "DL-123",
    });
    await activateTestDriver(
      driver.body.data.profileId,
      "TEST-VEHICLE-002",
      "TEST-VIN-00000000002",
    );

    await request(app)
      .patch("/api/v1/drivers/me/status")
      .set("Authorization", `Bearer ${driver.body.data.tokens.accessToken}`)
      .send({
        onlineStatus: DriverOnlineStatus.ONLINE,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      });

    await request(app)
      .post("/api/v1/drivers/me/location")
      .set("Authorization", `Bearer ${driver.body.data.tokens.accessToken}`)
      .send({
        coordinates: [-73.9855, 40.7485],
        heading: 90,
      });

    const trip = await request(app)
      .post("/api/v1/trips")
      .set("Authorization", `Bearer ${customerA.body.data.tokens.accessToken}`)
      .send({
        pickup: {
          coordinates: [-73.9851, 40.7488],
          address: "Empire State Building",
        },
        destination: {
          coordinates: [-73.9818, 40.7533],
          address: "Grand Central Terminal",
        },
        category: VehicleCategory.STANDARD,
      });

    const getByOtherUser = await request(app)
      .get(`/api/v1/trips/${trip.body.data._id}`)
      .set("Authorization", `Bearer ${customerB.body.data.tokens.accessToken}`);
    expect(getByOtherUser.status).toBe(403);

    const invalidTransition = await request(app)
      .post(`/api/v1/trips/${trip.body.data._id}/start`)
      .set("Authorization", `Bearer ${driver.body.data.tokens.accessToken}`);
    expect(invalidTransition.status).toBe(400);
  });
});
