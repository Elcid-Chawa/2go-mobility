import { PaymentProvider, ProcessPaymentParams, PaymentResult } from './paymentProvider.interface';
import { PaymentStatus } from '../../constants/tripStatus';

export class CashPaymentProvider implements PaymentProvider {
  name = 'CASH';

  async processPayment(params: ProcessPaymentParams): Promise<PaymentResult> {
    // In cash settlement, the driver collects directly from customer upon trip completion
    const providerReference = `CASH-TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      success: true,
      status: PaymentStatus.PAID,
      providerReference,
      message: 'Cash payment collected successfully',
    };
  }

  async verifyPayment(providerReference: string): Promise<PaymentResult> {
    return {
      success: true,
      status: PaymentStatus.PAID,
      providerReference,
    };
  }
}
