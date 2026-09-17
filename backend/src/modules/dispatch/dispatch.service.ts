import mongoose from "mongoose";
import { Driver, IDriver } from "../drivers/driver.model";
import { Trip, ITrip } from "../trips/trip.model";
import {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverOnlineStatus,
  TripStatus,
} from "../../constants/tripStatus";
import { VehicleCategory } from "../../constants/vehicleCategory";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

export interface DispatchCandidate {
  driver: IDriver;
  distanceKm: number;
}

export class DispatchService {
  /**
   * Finds ranked eligible drivers near the pickup location
   */
  static async findEligibleDrivers(
    pickupCoordinates: [number, number], // [lng, lat]
    category: VehicleCategory,
    maxDistanceMeters: number = env.DISPATCH_SEARCH_RADIUS_KM * 1000,
    excludedDriverIds: mongoose.Types.ObjectId[] = [],
  ): Promise<IDriver[]> {
    const query: any = {
      ...(excludedDriverIds.length ? { _id: { $nin: excludedDriverIds } } : {}),
      approvalStatus: DriverApprovalStatus.APPROVED,
      onlineStatus: DriverOnlineStatus.ONLINE,
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      currentLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupCoordinates,
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    };

    const eligibleDrivers = await Driver.find(query)
      .populate("userId", "name phone email")
      .populate("activeVehicleId")
      .limit(10);

    // Filter by vehicle category if vehicle exists
    return eligibleDrivers.filter((driver) => {
      const vehicle = driver.activeVehicleId as any;
      if (!vehicle) return true;
      if (vehicle.status !== "ACTIVE") return false;
      return vehicle.category === category;
    });
  }

  /**
   * Dispatches a trip to the best candidate driver
   */
  static async dispatchTrip(tripId: string, io?: any): Promise<boolean> {
    const trip = await Trip.findById(tripId);
    if (
      !trip ||
      (trip.status !== TripStatus.REQUESTED &&
        trip.status !== TripStatus.SEARCHING_DRIVER)
    ) {
      return false;
    }

    trip.status = TripStatus.SEARCHING_DRIVER;
    await trip.save();

    if (io) {
      io.to(`trip:${trip._id}`).emit("trip:searching", { tripId: trip._id });
      io.to("operations").emit("trip:searching", { tripId: trip._id });
    }

    const eligibleDrivers = await this.findEligibleDrivers(
      trip.pickup.location.coordinates,
      trip.category,
      env.DISPATCH_SEARCH_RADIUS_KM * 1000,
      trip.rejectedDriverIds || [],
    );

    if (eligibleDrivers.length === 0) {
      logger.warn(`No eligible drivers found for trip ${trip._id}`);
      const retryTimer = setTimeout(async () => {
        try {
          const stillSearching = await Trip.exists({
            _id: trip._id,
            status: TripStatus.SEARCHING_DRIVER,
          });
          if (stillSearching) await this.dispatchTrip(tripId, io);
        } catch (error) {
          logger.error(`Unable to retry dispatch for trip ${trip._id}`, { error });
        }
      }, 5000);
      retryTimer.unref?.();
      return false;
    }

    const candidate = eligibleDrivers[0];

    // Atomically assign offer
    trip.driverId = candidate._id as mongoose.Types.ObjectId;
    trip.status = TripStatus.DRIVER_ASSIGNED;
    trip.timestamps.assignedAt = new Date();
    await trip.save();

    candidate.availabilityStatus = DriverAvailabilityStatus.BUSY;
    await candidate.save();

    logger.info(`Offered trip ${trip._id} to driver ${candidate._id}`);

    if (io) {
      const driverUserId = (candidate.userId as any)?._id || candidate.userId;
      io.to(`user:${driverUserId}`).emit("trip:offer", {
        tripId: trip._id,
        pickup: trip.pickup,
        destination: trip.destination,
        estimatedFare: trip.estimatedFare,
        distanceKm: trip.distanceKm,
        timeoutSeconds: env.DISPATCH_OFFER_TIMEOUT_SECONDS,
      });

      io.to(`trip:${trip._id}`).emit("trip:assigned", {
        tripId: trip._id,
        driver: {
          id: candidate._id,
          name: (candidate.userId as any)?.name,
          rating: candidate.rating,
        },
      });
    }
    const expiryTimer = setTimeout(async () => {
      const expired = await Trip.findOneAndUpdate(
        {
          _id: trip._id,
          driverId: candidate._id,
          status: TripStatus.DRIVER_ASSIGNED,
        },
        {
          $set: { status: TripStatus.SEARCHING_DRIVER, driverId: null },
          $addToSet: { rejectedDriverIds: candidate._id },
        },
        { new: true },
      );
      if (expired) {
        candidate.availabilityStatus = DriverAvailabilityStatus.AVAILABLE;
        await candidate.save();
        if (io)
          io.to(`trip:${trip._id}`).emit("trip:offer_expired", {
            tripId: trip._id,
          });
        await this.dispatchTrip(tripId, io);
      }
    }, env.DISPATCH_OFFER_TIMEOUT_SECONDS * 1000);
    expiryTimer.unref?.();

    return true;
  }

  /**
   * Handles driver acceptance atomically
   */
  static async acceptTrip(
    tripId: string,
    driverUserId: string,
    io?: any,
  ): Promise<ITrip> {
    const driver = await Driver.findOne({ userId: driverUserId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }

    // Atomic update to prevent race conditions / duplicate acceptances
    const trip = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        driverId: driver._id,
        status: TripStatus.DRIVER_ASSIGNED,
      },
      {
        $set: {
          status: TripStatus.DRIVER_ACCEPTED,
          "timestamps.acceptedAt": new Date(),
        },
      },
      { new: true },
    ).populate({
      path: "driverId",
      populate: { path: "userId", select: "name phone email" },
    });

    if (!trip) {
      throw {
        statusCode: 409,
        message:
          "Unable to accept trip. It may have been reassigned, cancelled, or accepted already.",
      };
    }

    driver.availabilityStatus = DriverAvailabilityStatus.ON_TRIP;
    await driver.save();

    if (io) {
      io.to(`trip:${trip._id}`).emit("trip:accepted", {
        tripId: trip._id,
        driverId: driver._id,
        status: TripStatus.DRIVER_ACCEPTED,
      });
      io.to("operations").emit("trip:accepted", {
        tripId: trip._id,
        driverId: driver._id,
      });
    }

    return trip;
  }

  /**
   * Handles driver rejection / offer timeout
   */
  static async rejectTrip(
    tripId: string,
    driverUserId: string,
    io?: any,
  ): Promise<void> {
    const driver = await Driver.findOne({ userId: driverUserId });
    if (!driver) {
      throw { statusCode: 404, message: "Driver profile not found" };
    }
    driver.availabilityStatus = DriverAvailabilityStatus.AVAILABLE;
    await driver.save();

    const trip = await Trip.findOneAndUpdate(
      {
        _id: tripId,
        driverId: driver._id,
        status: TripStatus.DRIVER_ASSIGNED,
      },
      {
        $set: {
          status: TripStatus.SEARCHING_DRIVER,
          driverId: null,
        },
        $addToSet: { rejectedDriverIds: driver._id },
      },
      { new: true },
    );

    if (trip) {
      if (io) {
        io.to(`trip:${trip._id}`).emit("trip:rejected", { tripId: trip._id });
      }
      // Re-dispatch to next candidate
      setTimeout(() => {
        this.dispatchTrip(tripId, io);
      }, 1000);
    }
  }

  /**
   * Manual dispatch by Operations
   */
  static async manualAssign(
    tripId: string,
    driverId: string,
    io?: any,
  ): Promise<ITrip> {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      throw { statusCode: 404, message: "Driver not found" };
    }

    const trip = await Trip.findByIdAndUpdate(
      tripId,
      {
        $set: {
          driverId: driver._id,
          status: TripStatus.DRIVER_ASSIGNED,
          "timestamps.assignedAt": new Date(),
        },
      },
      { new: true },
    ).populate({
      path: "driverId",
      populate: { path: "userId", select: "name phone email" },
    });

    if (!trip) {
      throw { statusCode: 404, message: "Trip not found" };
    }

    driver.availabilityStatus = DriverAvailabilityStatus.BUSY;
    await driver.save();

    if (io) {
      io.to(`trip:${trip._id}`).emit("trip:assigned", {
        tripId: trip._id,
        driverId,
      });
      io.to("operations").emit("trip:assigned", { tripId: trip._id, driverId });
    }

    return trip;
  }
}
