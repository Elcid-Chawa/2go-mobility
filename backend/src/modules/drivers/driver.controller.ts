import { Response, NextFunction } from 'express';
import { DriverService } from './driver.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middlewares/auth';

export class DriverController {
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await DriverService.getProfileByUserId(req.userId!);
      ApiResponse.success(res, profile, 'Driver profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const driver = await DriverService.updateStatus(req.userId!, req.body);
      ApiResponse.success(res, driver, 'Driver status updated');
    } catch (error) {
      next(error);
    }
  }

  static async updateLocation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { coordinates, heading } = req.body;
      const driver = await DriverService.updateLocation(req.userId!, coordinates, heading);

      // Also emit to Socket.IO if attached
      const io = req.app.get('io');
      if (io) {
        io.to('operations').emit('driver:location_updated', {
          driverId: driver._id,
          userId: req.userId,
          coordinates,
          heading,
          onlineStatus: driver.onlineStatus,
          availabilityStatus: driver.availabilityStatus,
        });
      }

      ApiResponse.success(res, driver, 'Driver location updated');
    } catch (error) {
      next(error);
    }
  }

  static async getEarnings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const earnings = await DriverService.getEarnings(req.userId!);
      ApiResponse.success(res, earnings, 'Driver earnings retrieved');
    } catch (error) {
      next(error);
    }
  }
}
