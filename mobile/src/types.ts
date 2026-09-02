export type VehicleCategory = 'STANDARD' | 'COMFORT' | 'PREMIUM' | 'XL';

export type TripStatus =
  | 'REQUESTED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_ARRIVED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'RATED'
  | 'CANCELLED';

export interface FareEstimate {
  category: VehicleCategory;
  distanceKm: number;
  estimatedDurationMinutes: number;
  estimatedFare: number;
  currency: string;
}
