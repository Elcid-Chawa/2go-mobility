import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { ApiResponse } from '../../utils/apiResponse';

export class AdminController {
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AdminService.getDashboardKPIs();
      ApiResponse.success(res, data, 'Dashboard KPIs retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const trips = await AdminService.getTrips(req.query);
      ApiResponse.success(res, trips, 'Trips retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const drivers = await AdminService.getDrivers();
      ApiResponse.success(res, drivers, 'Drivers retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicles = await AdminService.getVehicles();
      ApiResponse.success(res, vehicles, 'Vehicles retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customers = await AdminService.getCustomers();
      ApiResponse.success(res, customers, 'Customers retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async manualAssign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const io = req.app.get('io');
      const { driverId } = req.body;
      const trip = await DispatchService.manualAssign(req.params.id as string, driverId, io);
      ApiResponse.success(res, trip, 'Driver manually assigned to trip');
    } catch (error) {
      next(error);
    }
  }
}
