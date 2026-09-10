import { Response, NextFunction } from "express";
import { TripService } from "./trip.service";
import { DispatchService } from "../dispatch/dispatch.service";
import { ApiResponse } from "../../utils/apiResponse";
import { AuthRequest } from "../../middlewares/auth";

export class TripController {
  static async createTrip(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const io = req.app.get("io");
      const trip = await TripService.createTrip(req.userId!, req.body, io);
      ApiResponse.created(res, trip, "Trip requested successfully");
    } catch (error) {
      next(error);
    }
  }

  static async getTrip(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const trip = await TripService.getTripById(
        req.params.id as string,
        req.userId,
        req.userRole,
      );
      ApiResponse.success(res, trip, "Trip details retrieved");
    } catch (error) {
      next(error);
    }
  }

  static async acceptTrip(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const io = req.app.get("io");
      const trip = await DispatchService.acceptTrip(
        req.params.id as string,
        req.userId!,
        io,
      );
      ApiResponse.success(res, trip, "Trip offer accepted");
    } catch (error) {
      next(error);
    }
  }

  static async rejectTrip(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const io = req.app.get("io");
      await DispatchService.rejectTrip(
        req.params.id as string,
        req.userId!,
        io,
      );
      ApiResponse.success(res, null, "Trip offer rejected");
    } catch (error) {
      next(error);
    }
  }

  static async markArrived(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const io = req.app.get("io");
      const trip = await TripService.markArrived(
        req.params.id as string,
        req.userId!,
        io,
      );
      ApiResponse.success(res, trip, "Driver marked arrived at pickup");
    } catch (error) {
      next(error);
    }
  }

  static async startTrip(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const io = req.app.get("io");
      const trip = await TripService.startTrip(
        req.params.id as string,
        req.userId!,
        io,
      );
      ApiResponse.success(res, trip, "Trip started");
    } catch (error) {
      next(error);
    }
  }

  static async recordLocation(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const io = req.app.get("io");
      const { coordinates, heading, speed } = req.body;
      await TripService.recordLocation(
        req.params.id as string,
        req.userId!,
        coordinates,
        heading,
        speed,
        io,
      );
      ApiResponse.success(res, null, "Location recorded");
    } catch (error) {
      next(error);
    }
  }

  static async completeTrip(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const io = req.app.get("io");
      const trip = await TripService.completeTrip(
        req.params.id as string,
        req.userId!,
        io,
      );
      ApiResponse.success(res, trip, "Trip completed successfully");
    } catch (error) {
      next(error);
    }
  }

  static async cancelTrip(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const io = req.app.get("io");
      const { reason } = req.body;
      const trip = await TripService.cancelTrip(
        req.params.id as string,
        req.userId!,
        reason || "Cancelled by user",
        req.userRole,
        io,
      );
      ApiResponse.success(res, trip, "Trip cancelled");
    } catch (error) {
      next(error);
    }
  }
}
