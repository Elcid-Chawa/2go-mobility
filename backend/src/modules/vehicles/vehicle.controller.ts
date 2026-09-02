import { Request, Response, NextFunction } from 'express';
import { VehicleService } from './vehicle.service';
import { ApiResponse } from '../../utils/apiResponse';

export class VehicleController {
  static async createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await VehicleService.createVehicle(req.body);
      ApiResponse.created(res, vehicle, 'Vehicle registered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicles = await VehicleService.getVehicles();
      ApiResponse.success(res, vehicles, 'Vehicles retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getVehicleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await VehicleService.getVehicleById(req.params.id as string);
      ApiResponse.success(res, vehicle, 'Vehicle retrieved');
    } catch (error) {
      next(error);
    }
  }
}
