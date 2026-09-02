import { Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middlewares/auth';

export class PaymentController {
  static async recordPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const io = req.app.get('io');
      const { method } = req.body;
      const payment = await PaymentService.recordPayment(req.params.id as string, method, io);
      ApiResponse.success(res, payment, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPayment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await PaymentService.getPaymentByTripId(req.params.id as string);
      ApiResponse.success(res, payment, 'Payment record retrieved');
    } catch (error) {
      next(error);
    }
  }
}
