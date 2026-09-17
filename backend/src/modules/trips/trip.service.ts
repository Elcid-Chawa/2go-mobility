import mongoose from "mongoose";
import { Trip, ITrip } from "./trip.model";
import { TripLocation } from "./tripLocation.model";
import { Customer } from "../customers/customer.model";
import { Driver } from "../drivers/driver.model";
import {
  TripStatus,
  PaymentStatus,
  PaymentMethod,
  DriverAvailabilityStatus,
} from "../../constants/tripStatus";
import { VehicleCategory } from "../../constants/vehicleCategory";
import { UserRole } from "../../constants/roles";
import { PricingService } from "../pricing/pricing.service";
import { DispatchService } from "../dispatch/dispatch.service";
import { calculateDistanceKm, resolveLocationValue } from "../../utils/geo";
import { logger } from "../../config/logger";

export interface CreateTripDTO {
  pickup: {
    address: string;
    coordinates: [number, number]; // [lng, lat]
  };
  destination: {
    address: string;
    coordinates: [number, number]; // [lng, lat]
  };
  category?: VehicleCategory;
  paymentMethod?: PaymentMethod;
  routedDistanceKm?: number;
}

export class TripService {
  static async getCustomerTripHistory(userId: string): Promise<ITrip[]> {
    const customer = await Customer.findOne({ userId }).select("_id");
    if (!customer) {
      throw { statusCode: 404, message: "Customer profile not found" };
    }

    return Trip.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: "driverId",
        populate: [
          { path: "userId", select: "name phone" },
          { path: "activeVehicleId" },
        ],
      });
  }

  static async getActiveTrip(
    userId: string,
    userRole?: UserRole,
  ): Promise<ITrip | null> {
    const terminalStatuses = [TripStatus.RATED, TripStatus.CANCELLED];
    let ownerQuery: Record<string, unknown> = {};

    if (userRole === UserRole.CUSTOMER) {
      const customer = await Customer.findOne({ userId }).select("_id");
      if (!customer) return null;
      ownerQuery = { customerId: customer._id };
    } else if (userRole === UserRole.DRIVER) {
      const driver = await Driver.findOne({ userId }).select("_id");
      if (!driver) return null;
      ownerQuery = { driverId: driver._id };
    } else {
      throw { statusCode: 403, message: "Active rides are only available to riders and drivers." };
    }

    return Trip.findOne({
      ...ownerQuery,
      status: { $nin: terminalStatuses },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "customerId",
        populate: { path: "userId", select: "name phone email" },
      })
      .populate({
        path: "driverId",
        populate: [
          { path: "userId", select: "name phone email" },
          { path: "activeVehicleId" },
        ],
      });
  }

  /**
   * Allowed state transitions map
   */
  private static allowedTransitions: Record<TripStatus, TripStatus[]> = {
    [TripStatus.REQUESTED]: [
      TripStatus.SEARCHING_DRIVER,
      TripStatus.DRIVER_ASSIGNED,
      TripStatus.CANCELLED,
    ],
    [TripStatus.SEARCHING_DRIVER]: [
      TripStatus.DRIVER_ASSIGNED,
      TripStatus.CANCELLED,
    ],
    [TripStatus.DRIVER_ASSIGNED]: [
      TripStatus.DRIVER_ACCEPTED,
      TripStatus.SEARCHING_DRIVER,
      TripStatus.CANCELLED,
    ],
    [TripStatus.DRIVER_ACCEPTED]: [
      TripStatus.DRIVER_ARRIVED,
      TripStatus.CANCELLED,
    ],
    [TripStatus.DRIVER_ARRIVED]: [
      TripStatus.TRIP_STARTED,
      TripStatus.CANCELLED,
    ],
    [TripStatus.TRIP_STARTED]: [TripStatus.TRIP_COMPLETED],
    [TripStatus.TRIP_COMPLETED]: [TripStatus.PAYMENT_PENDING, TripStatus.PAID],
    [TripStatus.PAYMENT_PENDING]: [TripStatus.PAID],
    [TripStatus.PAID]: [TripStatus.RATED],
    [TripStatus.RATED]: [],
    [TripStatus.CANCELLED]: [],
  };

  static validateTransition(
    currentStatus: TripStatus,
    targetStatus: TripStatus,
  ): void {
    const allowed = this.allowedTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw {
        statusCode: 400,
        message: `Invalid trip state transition from '${currentStatus}' to '${targetStatus}'`,
      };
    }
  }

  static async createTrip(
    customerId: string,
    dto: CreateTripDTO,
    io?: any,
  ): Promise<ITrip> {
    const customer = await Customer.findOne({ userId: customerId });
    if (!customer) {
      throw { statusCode: 404, message: "Customer profile not found" };
    }

    const pickup = await resolveLocationValue(dto.pickup);
    const destination = await resolveLocationValue(dto.destination);
    const category = dto.category || VehicleCategory.STANDARD;
    const estimate = await PricingService.calculateEstimate(
      pickup.coordinates,
      destination.coordinates,
      category,
      dto.routedDistanceKm,
    );

    const trip = new Trip({
      customerId: customer._id,
      pickup: {
        address: pickup.address,
        location: {
          type: "Point",
          coordinates: pickup.coordinates,
        },
      },
      destination: {
        address: destination.address,
        location: {
          type: "Point",
          coordinates: destination.coordinates,
        },
      },
      distanceKm: estimate.distanceKm,
      estimatedDurationMinutes: estimate.estimatedDurationMinutes,
      estimatedFare: estimate.estimatedFare,
      category,
      paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
      status: TripStatus.REQUESTED,
      paymentStatus: PaymentStatus.PENDING,
      timestamps: {
        requestedAt: new Date(),
      },
    });

    await trip.save();

    logger.info(`Trip created: ${trip._id} by customer ${customer._id}`);

    // Trigger async dispatch
    setImmediate(() => {
      DispatchService.dispatchTrip(trip._id.toString(), io);
    });

    return trip;
  }

  static async assertTripAccess(
    trip: ITrip,
    userId?: string,
    userRole?: UserRole,
  ): Promise<void> {
    if (!userId) {
      throw { statusCode: 401, message: "Authentication required" };
    }

    if (userRole === UserRole.ADMIN || userRole === UserRole.OPERATIONS) {
      return;
    }

    const customerProfile = await Customer.findOne({ userId });
    const driverProfile = await Driver.findOne({ userId });
    const tripCustomerId = (trip.customerId as any)?._id
      ? (trip.customerId as any)._id.toString()
      : trip.customerId?.toString();
    const tripDriverId = (trip.driverId as any)?._id
      ? (trip.driverId as any)._id.toString()
      : trip.driverId?.toString();

    const isCustomerOwner = Boolean(
      customerProfile && tripCustomerId === customerProfile._id.toString(),
    );
    const isDriverOwner = Boolean(
      driverProfile &&
      tripDriverId &&
      tripDriverId === driverProfile._id.toString(),
    );

    if (!isCustomerOwner && !isDriverOwner) {
      throw {
        statusCode: 403,
        message: "You are not authorized to access this trip.",
      };
    }
  }

  static async getTripById(
    tripId: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<ITrip> {
    const trip = await Trip.findById(tripId)
      .populate({
        path: "customerId",
        populate: { path: "userId", select: "name phone email" },
      })
      .populate({
        path: "driverId",
        populate: [
          { path: "userId", select: "name phone email" },
          { path: "activeVehicleId" },
        ],
      });

    if (!trip) {
      throw { statusCode: 404, message: "Trip not found" };
    }

    await this.assertTripAccess(trip, userId, userRole);
    return trip;
  }

  static async markArrived(
    tripId: string,
    driverUserId: string,
    io?: any,
  ): Promise<ITrip> {
    const driver = await Driver.findOne({ userId: driverUserId });
    const trip = await Trip.findById(tripId);

    if (
      !trip ||
      !driver ||
      trip.driverId?.toString() !== driver._id.toString()
    ) {
      throw { statusCode: 403, message: "Unauthorized or trip not found" };
    }

    this.validateTransition(trip.status, TripStatus.DRIVER_ARRIVED);

    trip.status = TripStatus.DRIVER_ARRIVED;
    trip.timestamps.arrivedAt = new Date();
    await trip.save();

    if (io) {
      io.to(`trip:${trip._id}`).emit("trip:arrived", { tripId: trip._id });
      io.to("operations").emit("trip:arrived", { tripId: trip._id });
    }

    return trip;
  }

  static async startTrip(
    tripId: string,
    driverUserId: string,
    io?: any,
  ): Promise<ITrip> {
    const driver = await Driver.findOne({ userId: driverUserId });
    const trip = await Trip.findById(tripId);

    if (
      !trip ||
      !driver ||
      trip.driverId?.toString() !== driver._id.toString()
    ) {
      throw { statusCode: 403, message: "Unauthorized or trip not found" };
    }

    this.validateTransition(trip.status, TripStatus.TRIP_STARTED);

    trip.status = TripStatus.TRIP_STARTED;
    trip.timestamps.startedAt = new Date();
    await trip.save();

    if (io) {
      io.to(`trip:${trip._id}`).emit("trip:started", { tripId: trip._id });
      io.to("operations").emit("trip:started", { tripId: trip._id });
    }

    return trip;
  }

  static async recordLocation(
    tripId: string,
    driverUserId: string,
    coordinates: [number, number],
    heading = 0,
    speed = 0,
    io?: any,
  ): Promise<void> {
    const driver = await Driver.findOne({ userId: driverUserId });
    if (!driver) return;

    // Record breadcrumb
    await TripLocation.create({
      tripId,
      driverId: driver._id,
      location: {
        type: "Point",
        coordinates,
      },
      heading,
      speed,
      timestamp: new Date(),
    });

    // Update driver's live coordinate
    driver.currentLocation = { type: "Point", coordinates };
    driver.currentHeading = heading;
    driver.lastLocationUpdate = new Date();
    await driver.save();

    // Real-time broadcast to trip room & operations
    if (io) {
      io.to(`trip:${tripId}`).emit("trip:location_updated", {
        tripId,
        coordinates,
        heading,
        speed,
        timestamp: new Date().toISOString(),
      });
      io.to("operations").emit("trip:location_updated", {
        tripId,
        coordinates,
        heading,
        speed,
      });
    }
  }

  static async completeTrip(
    tripId: string,
    driverUserId: string,
    io?: any,
  ): Promise<ITrip> {
    const driver = await Driver.findOne({ userId: driverUserId });
    const trip = await Trip.findById(tripId);

    if (
      !trip ||
      !driver ||
      trip.driverId?.toString() !== driver._id.toString()
    ) {
      throw { statusCode: 403, message: "Unauthorized or trip not found" };
    }

    this.validateTransition(trip.status, TripStatus.TRIP_COMPLETED);

    trip.status = TripStatus.TRIP_COMPLETED;
    const pickupWaitMinutes = trip.timestamps.arrivedAt && trip.timestamps.startedAt
      ? Math.max(0, (trip.timestamps.startedAt.getTime() - trip.timestamps.arrivedAt.getTime()) / 60000)
      : 0;
    const chargeableWaitingBlocks = Math.ceil(Math.max(0, pickupWaitMinutes - 15) / 15);
    trip.waitingFare = chargeableWaitingBlocks * 1500;
    trip.finalFare = trip.estimatedFare + trip.waitingFare;
    trip.timestamps.completedAt = new Date();
    await trip.save();

    // Release driver
    driver.availabilityStatus = DriverAvailabilityStatus.AVAILABLE;
    driver.totalTrips += 1;
    driver.totalEarnings += trip.finalFare;
    await driver.save();

    if (io) {
      io.to(`trip:${trip._id}`).emit("trip:completed", {
        tripId: trip._id,
        finalFare: trip.finalFare,
      });
      io.to("operations").emit("trip:completed", {
        tripId: trip._id,
        finalFare: trip.finalFare,
      });
    }

    return trip;
  }

  static async cancelTrip(
    tripId: string,
    userId: string,
    reason: string,
    userRole?: UserRole,
    io?: any,
  ): Promise<ITrip> {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      throw { statusCode: 404, message: "Trip not found" };
    }

    if (
      trip.status === TripStatus.TRIP_STARTED ||
      trip.status === TripStatus.TRIP_COMPLETED ||
      trip.status === TripStatus.PAYMENT_PENDING ||
      trip.status === TripStatus.PAID ||
      trip.status === TripStatus.RATED ||
      trip.status === TripStatus.CANCELLED
    ) {
      throw {
        statusCode: 409,
        message: "This ride can no longer be cancelled in the app. Contact support for an active-trip safety issue.",
      };
    }

    if (userRole !== UserRole.ADMIN && userRole !== UserRole.OPERATIONS) {
      const customer = await Customer.findOne({ userId });
      const driver = await Driver.findOne({ userId });
      const isCustomerOwner =
        customer?._id && trip.customerId.toString() === customer._id.toString();
      const isDriverOwner =
        driver?._id &&
        trip.driverId &&
        trip.driverId.toString() === driver._id.toString();
      if (!isCustomerOwner && !isDriverOwner) {
        throw {
          statusCode: 403,
          message: "You are not authorized to cancel this trip.",
        };
      }
    }

    this.validateTransition(trip.status, TripStatus.CANCELLED);

    trip.status = TripStatus.CANCELLED;
    trip.cancellationReason = (reason || "Cancelled by user").trim().slice(0, 240);
    trip.cancelledBy = new mongoose.Types.ObjectId(userId);
    trip.timestamps.cancelledAt = new Date();
    await trip.save();

    if (trip.driverId) {
      await Driver.findByIdAndUpdate(trip.driverId, {
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      });
    }

    if (io) {
      io.to(`trip:${trip._id}`).emit("trip:cancelled", {
        tripId: trip._id,
        reason,
        cancelledBy: userRole,
      });
      io.to("operations").emit("trip:cancelled", { tripId: trip._id, reason });
    }

    return trip;
  }
}
