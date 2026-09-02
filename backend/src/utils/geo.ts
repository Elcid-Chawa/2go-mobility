export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates Great-Circle distance between two points in Kilometers using Haversine formula
 */
export function calculateDistanceKm(
  coord1: { latitude: number; longitude: number } | [number, number], // [lng, lat]
  coord2: { latitude: number; longitude: number } | [number, number]
): number {
  const lat1 = Array.isArray(coord1) ? coord1[1] : coord1.latitude;
  const lon1 = Array.isArray(coord1) ? coord1[0] : coord1.longitude;
  const lat2 = Array.isArray(coord2) ? coord2[1] : coord2.latitude;
  const lon2 = Array.isArray(coord2) ? coord2[0] : coord2.longitude;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 100) / 100; // 2 decimal places
}

/**
 * Estimates driving duration in minutes given distance in km and average urban speed (default: 30 km/h)
 */
export function estimateDurationMinutes(distanceKm: number, averageSpeedKmh = 30): number {
  const hours = distanceKm / averageSpeedKmh;
  return Math.max(1, Math.round(hours * 60));
}
