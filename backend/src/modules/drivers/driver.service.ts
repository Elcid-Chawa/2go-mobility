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
      if (
        driver.deliveryAssignmentId &&
        data.onlineStatus === DriverOnlineStatus.OFFLINE
      ) {
        throw { statusCode: 409, message: "Complete or cancel the assigned delivery before going offline." };
      }
      driver.onlineStatus = data.onlineStatus;
      if (data.onlineStatus === DriverOnlineStatus.OFFLINE) {
        driver.availabilityStatus = DriverAvailabilityStatus.AVAILABLE;
      }
    }

    if (data.availabilityStatus !== undefined) {
      driver.availabilityStatus = driver.deliveryAssignmentId
        ? DriverAvailabilityStatus.BUSY
        : data.availabilityStatus;
    }

    await driver.save();
    return driver;
  }

  static async setDeliveryAssignment(
    driverId: string,
    deliveryId: string,
    action: "LOCK" | "RELEASE",
  ): Promise<IDriver> {
    if (action === "LOCK") {
      const current = await Driver.findById(driverId);
      if (!current) throw { statusCode: 404, message: "Driver not found" };
      if (current.deliveryAssignmentId === deliveryId) return current;
      const vehicle = current.activeVehicleId
        ? await Vehicle.findOne({ _id: current.activeVehicleId, status: "ACTIVE" })
        : null;
      if (
        current.approvalStatus !== DriverApprovalStatus.APPROVED ||
        current.onlineStatus !== DriverOnlineStatus.ONLINE ||
        current.availabilityStatus !== DriverAvailabilityStatus.AVAILABLE ||
        !vehicle
      ) {
        throw { statusCode: 409, message: "Driver must be approved, online, available, and have an active vehicle." };
      }
      const locked = await Driver.findOneAndUpdate(
        {
          _id: driverId,
          approvalStatus: DriverApprovalStatus.APPROVED,
          onlineStatus: DriverOnlineStatus.ONLINE,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
          activeVehicleId: current.activeVehicleId,
          deliveryAssignmentId: { $exists: false },
        },
        {
          $set: {
            availabilityStatus: DriverAvailabilityStatus.BUSY,
            deliveryAssignmentId: deliveryId,
          },
        },
        { new: true },
      );
      if (locked) return locked;
      const latest = await Driver.findById(driverId);
      if (latest?.deliveryAssignmentId === deliveryId) return latest;
      throw { statusCode: 409, message: "Driver is no longer available for assignment." };
    }

    const released = await Driver.findOneAndUpdate(
      { _id: driverId, deliveryAssignmentId: deliveryId },
      {
        $set: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
        $unset: { deliveryAssignmentId: 1 },
      },
      { new: true },
    );
    if (released) return released;
    const current = await Driver.findById(driverId);
    if (!current) throw { statusCode: 404, message: "Driver not found" };
    if (!current.deliveryAssignmentId) return current;
    throw { statusCode: 409, message: "Driver is assigned to a different delivery." };
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
