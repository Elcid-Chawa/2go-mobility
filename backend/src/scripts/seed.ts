import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { User } from "../modules/users/user.model";
import { Customer } from "../modules/customers/customer.model";
import { Driver } from "../modules/drivers/driver.model";
import { Vehicle } from "../modules/vehicles/vehicle.model";
import { PricingRule } from "../modules/pricing/pricing.model";
import { UserRole, UserStatus } from "../constants/roles";
import { VehicleCategory, VehicleStatus } from "../constants/vehicleCategory";
import {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverOnlineStatus,
} from "../constants/tripStatus";
import { logger } from "../config/logger";

export const seedDatabase = async () => {
  try {
    await connectDatabase();
    logger.info("Clearing existing data for clean seed...");

    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Driver.deleteMany({}),
      Vehicle.deleteMany({}),
      PricingRule.deleteMany({}),
    ]);

    const salt = await bcrypt.genSalt(14);
    const defaultPasswordHash = await bcrypt.hash("Password123!", salt);

    // 1. Seed Pricing Rules
    logger.info("Seeding pricing rules...");
    await PricingRule.create([
      {
        category: VehicleCategory.STANDARD,
        baseFare: 800,
        pricePerKm: 700,
        pricePerMinute: 0,
        minimumFare: 1500,
        longDistanceRate: 500,
        longDistanceThresholdKm: 30,
        surgeMultiplier: 1.0,
        isActive: true,
      },
      {
        category: VehicleCategory.COMFORT,
        baseFare: 1000,
        pricePerKm: 875,
        pricePerMinute: 0,
        minimumFare: 2500,
        longDistanceRate: 625,
        longDistanceThresholdKm: 30,
        surgeMultiplier: 1.0,
        isActive: true,
      },
      {
        category: VehicleCategory.PREMIUM,
        baseFare: 1600,
        pricePerKm: 1120,
        pricePerMinute: 0,
        minimumFare: 5000,
        longDistanceRate: 800,
        longDistanceThresholdKm: 30,
        surgeMultiplier: 1.0,
        isActive: true,
      },
      {
        category: VehicleCategory.XL,
        baseFare: 1200,
        pricePerKm: 1000,
        pricePerMinute: 0,
        minimumFare: 3500,
        longDistanceRate: 750,
        longDistanceThresholdKm: 30,
        surgeMultiplier: 1.0,
        isActive: true,
      },
    ]);

    // 2. Seed Admin / Operations User
    logger.info("Seeding Operations Admin user...");
    await User.create({
      name: "Operations Admin",
      email: "admin@2go.com",
      phone: "+1000000001",
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    // 3. Seed Demo Customer
    logger.info("Seeding Demo Customer...");
    const customerUser = await User.create({
      name: "Alice Customer",
      email: "customer@2go.com",
      phone: "+1000000002",
      passwordHash: defaultPasswordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    });

    await Customer.create({
      userId: customerUser._id,
      savedPlaces: [
        {
          name: "Home",
          address: "100 Main St, Downtown",
          location: { type: "Point", coordinates: [-73.98513, 40.748817] },
        },
        {
          name: "Work",
          address: "500 5th Ave, Midtown",
          location: { type: "Point", coordinates: [-73.981885, 40.753381] },
        },
      ],
    });

    // 4. Seed Demo Driver & Vehicle
    logger.info("Seeding Demo Driver & Vehicle...");
    const driverUser = await User.create({
      name: "Bob Driver",
      email: "driver@2go.com",
      phone: "+1000000003",
      passwordHash: defaultPasswordHash,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    });

    const driver = await Driver.create({
      userId: driverUser._id,
      licenseNumber: "DL-NY-889922",
      approvalStatus: DriverApprovalStatus.APPROVED,
      onlineStatus: DriverOnlineStatus.ONLINE,
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      currentLocation: {
        type: "Point",
        coordinates: [-73.9855, 40.7485], // Close to customer pickup
      },
      rating: 4.95,
      totalTrips: 142,
    });

    const vehicle = await Vehicle.create({
      driverId: driver._id,
      registrationNumber: "2GO-NY-909",
      make: "Toyota",
      model: "Camry Hybrid",
      year: 2023,
      color: "Midnight Black",
      category: VehicleCategory.STANDARD,
      status: VehicleStatus.ACTIVE,
    });

    driver.activeVehicleId = vehicle._id as mongoose.Types.ObjectId;
    await driver.save();

    logger.info("Database seeding completed successfully!");
    logger.info("-------------------------------------------");
    logger.info("Demo Credentials (Password: Password123!):");
    logger.info(" - Admin:    admin@2go.com");
    logger.info(" - Customer: customer@2go.com");
    logger.info(" - Driver:   driver@2go.com");
    logger.info("-------------------------------------------");
  } catch (error) {
    logger.error("Error during database seed", { error });
  } finally {
    await disconnectDatabase();
  }
};

if (require.main === module) {
  seedDatabase();
}
