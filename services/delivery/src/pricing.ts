export interface DeliveryPricing {
  baseFee: number;
  perKmRate: number;
  perKgRate: number;
  roadFactor: number;
  currency: string;
}

export interface DeliveryEstimate {
  distanceKm: number;
  fare: number;
  currency: string;
}

export function calculateDeliveryEstimate(
  pickup: [number, number],
  destination: [number, number],
  weightKg: number,
  pricing: DeliveryPricing,
): DeliveryEstimate {
  const [pickupLongitude, pickupLatitude] = pickup;
  const [destinationLongitude, destinationLatitude] = destination;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(destinationLatitude - pickupLatitude);
  const longitudeDelta = radians(destinationLongitude - pickupLongitude);
  const haversine = Math.min(1,
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(pickupLatitude)) *
      Math.cos(radians(destinationLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2,
  );
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const roadDistanceKm = distanceKm * pricing.roadFactor;
  const rawFare = pricing.baseFee + roadDistanceKm * pricing.perKmRate + weightKg * pricing.perKgRate;
  return {
    distanceKm: Math.round(roadDistanceKm * 10) / 10,
    fare: Math.ceil(rawFare / 100) * 100,
    currency: pricing.currency,
  };
}
