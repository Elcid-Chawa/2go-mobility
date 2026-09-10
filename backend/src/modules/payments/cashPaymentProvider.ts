import {
  PaymentProvider,
  ProcessPaymentParams,
  PaymentResult,
} from "./paymentProvider.interface";
import { PaymentStatus } from "../../constants/tripStatus";

export class CashPaymentProvider implements PaymentProvider {
  name = "MANUAL";

  async processPayment(params: ProcessPaymentParams): Promise<PaymentResult> {
    // Manual settlement records the method selected by the customer or operator.
    const providerReference = `CASH-TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return {
      success: true,
      status: PaymentStatus.PAID,
      providerReference,
      message: "Cash payment collected successfully",
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
