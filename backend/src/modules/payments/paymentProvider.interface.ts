import { PaymentStatus } from '../../constants/tripStatus';

export interface ProcessPaymentParams {
  tripId: string;
  customerId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  status: PaymentStatus;
  providerReference: string;
  message?: string;
}

export interface PaymentProvider {
  name: string;
  processPayment(params: ProcessPaymentParams): Promise<PaymentResult>;
  verifyPayment(providerReference: string): Promise<PaymentResult>;
}
