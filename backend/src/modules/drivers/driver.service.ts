import { Driver, IDriver } from "./driver.model";
import {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverOnlineStatus,
} from "../../constants/tripStatus";
import { VehicleCategory } from "../../constants/vehicleCategory";
import { Vehicle, IVehicle } from "../vehicles/vehicle.model";

export class DriverService {
  static async getNearbyDrivers(
    longitude: number,
    latitude: number,
    radiusKm: number,
    category?: VehicleCategory,
  ): Promise<any[]> {
    const drivers = await Driver.find({
      approvalStatus: DriverApprovalStatus.APPROVED,
      onlineStatus: DriverOnlineStatus.ONLINE,
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      lastLocationUpdate: { $gte: new Date(Date.now() - 2 * 60 * 1000) },
      currentLocation: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: radiusKm * 1000,
        },
      },
    })
      .populate("userId", "name")
      .populate("activeVehicleId", "category make model color");

    return drivers
      .filter((driver) => {
        const vehicle = driver.activeVehicleId as any;
        return Boolean(
          vehicle &&
          vehicle.status === "ACTIVE" &&
          (!category || vehicle.category === category),
        );
      })
      .map((driver) => {
        const vehicle = driver.activeVehicleId as any;
        return {
          driverId: driver._id,
          name: (driver.userId as any)?.name,
          rating: driver.rating,
          heading: driver.currentHeading || 0,
          category: vehicle?.category,
          location: driver.currentLocation,
          lastLocationUpdate: driver.lastLocationUpdate,
        };
      });
  }

  static async getProfileByUserId(userId: string): Promise<any> {
    const driver = await Driver.findOne({ userId })
      .populate("userId", "name email phone role status")
      .populate("activeVehicleId");
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }
    return driver;
  }

  static async updateStatus(
    userId: string,
    data: {
      onlineStatus?: DriverOnlineStatus;
      availabilityStatus?: DriverAvailabilityStatus;
    },
  ): Promise<IDriver> {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver not found" };
    }

    if (
      data.onlineStatus === DriverOnlineStatus.ONLINE &&
      driver.approvalStatus !== DriverApprovalStatus.APPROVED
    ) {
      throw { statusCode: 403, message: "Your driver account must be approved before going online." };
    }
    if (data.onlineStatus === DriverOnlineStatus.ONLINE) {
      const vehicle = driver.activeVehicleId
        ? await Vehicle.findOne({
            _id: driver.activeVehicleId,
            status: "ACTIVE",
          })
        : null;
      if (!vehicle) {
        throw { statusCode: 403, message: "An active vehicle must be assigned before going online." };
      }
    }

    if (data.onlineStatus !== undefined) {
      driver.onlineStatus = data.onlineStatus;
      if (data.onlineStatus === DriverOnlineStatus.OFFLINE) {
        driver.availabilityStatus = DriverAvailabilityStatus.AVAILABLE;
      }
    }

    if (data.availabilityStatus !== undefined) {
      driver.availabilityStatus = data.availabilityStatus;
    }

    await driver.save();
    return driver;
  }

  static async updateLocation(
    userId: string,
    coordinates: [number, number], // [lng, lat]
    heading = 0,
  ): Promise<IDriver> {
    const driver = await Driver.findOneAndUpdate(
      { userId },
      {
        $set: {
          currentLocation: {
            type: "Point",
            coordinates,
          },
          currentHeading: heading,
          lastLocationUpdate: new Date(),
        },
      },
      { new: true },
    );

    if (!driver) {
      throw { statusCode: 404, message: "Driver not found" };
    }

    return driver;
  }

  static async getEarnings(userId: string): Promise<any> {
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver not found" };
    }

    return {
      totalEarnings: driver.totalEarnings,
      totalTrips: driver.totalTrips,
      rating: driver.rating,
      currency: "RWF",
    };
  }
}
