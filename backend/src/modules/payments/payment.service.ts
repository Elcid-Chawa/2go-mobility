import { Payment, IPayment } from "./payment.model";
import { Trip } from "../trips/trip.model";
import { CashPaymentProvider } from "./cashPaymentProvider";
import { PaymentProvider } from "./paymentProvider.interface";
import {
  PaymentMethod,
  PaymentStatus,
  TripStatus,
} from "../../constants/tripStatus";

export class PaymentService {
  private static providers: Record<string, PaymentProvider> = {
    [PaymentMethod.CASH]: new CashPaymentProvider(),
  };

  static registerProvider(method: string, provider: PaymentProvider): void {
    this.providers[method] = provider;
  }

  static async recordPayment(
    tripId: string,
    method: PaymentMethod = PaymentMethod.CASH,
    io?: any,
  ): Promise<IPayment> {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      throw { statusCode: 404, message: "Trip not found" };
    }

    // Check if payment already exists to prevent duplicate payment records (FR-063)
    let payment = await Payment.findOne({ tripId: trip._id });
    if (payment && payment.status === PaymentStatus.PAID) {
      return payment;
    }

    const provider =
      this.providers[method] || this.providers[PaymentMethod.CASH];
    const result = await provider.processPayment({
      tripId: trip._id.toString(),
      customerId: trip.customerId.toString(),
      amount: trip.finalFare || trip.estimatedFare,
      currency: "RWF",
    });

    if (!payment) {
      payment = new Payment({
        tripId: trip._id,
        customerId: trip.customerId,
        amount: trip.finalFare || trip.estimatedFare,
        currency: "RWF",
        method,
        provider: provider.name,
        providerReference: result.providerReference,
        status: result.status,
      });
    } else {
      payment.status = result.status;
      payment.providerReference = result.providerReference;
    }

    await payment.save();

    // Update trip payment status & trip status to PAID
    trip.paymentStatus = result.status;
    trip.status = TripStatus.PAID;
    trip.timestamps.paidAt = new Date();
    await trip.save();

    if (io) {
      io.to(`trip:${trip._id}`).emit("payment:updated", {
        tripId: trip._id,
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
      });
      io.to("operations").emit("payment:updated", {
        tripId: trip._id,
        paymentId: payment._id,
        amount: payment.amount,
      });
    }

    return payment;
  }

  static async getPaymentByTripId(tripId: string): Promise<IPayment> {
    const payment = await Payment.findOne({ tripId });
    if (!payment) {
      throw { statusCode: 404, message: "Payment record not found" };
    }
    return payment;
  }
}
