import { Response, NextFunction } from 'express';
import { CustomerService } from './customer.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middlewares/auth';

export class CustomerController {
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await CustomerService.getProfileByUserId(req.userId!);
      ApiResponse.success(res, profile, 'Customer profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await CustomerService.updateProfile(req.userId!, req.body);
      ApiResponse.success(res, updated, 'Customer profile updated');
    } catch (error) {
      next(error);
    }
  }

  static async addSavedPlace(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomerService.addSavedPlace(req.userId!, req.body);
      ApiResponse.success(res, customer.savedPlaces, 'Saved place added');
    } catch (error) {
      next(error);
    }
  }
}
