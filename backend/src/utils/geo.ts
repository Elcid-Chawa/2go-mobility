export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export type GeoInput = GeoCoordinates | [number, number];

export function normalizeGeoInput(input: GeoInput): GeoCoordinates {
  if (Array.isArray(input)) {
    return {
      latitude: input[1],
      longitude: input[0],
    };
  }

  return {
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

export async function resolveLocationValue(
  value: string | GeoInput | { address?: string; coordinates?: GeoInput },
): Promise<{ address: string; coordinates: [number, number] }> {
  if (typeof value === "string") {
    const coordinates = await geocodeAddress(value);
    return { address: value, coordinates };
  }

  if (value && typeof value === "object" && "coordinates" in value) {
    const coordinates = normalizeGeoInput(value.coordinates as GeoInput);
    const address =
      value.address || `${coordinates.latitude},${coordinates.longitude}`;
    return {
      address,
      coordinates: [coordinates.longitude, coordinates.latitude],
    };
  }

  const coordinates = normalizeGeoInput(value as GeoInput);
  return {
    address: `${coordinates.latitude},${coordinates.longitude}`,
    coordinates: [coordinates.longitude, coordinates.latitude],
  };
}

export async function geocodeAddress(
  address: string,
): Promise<[number, number]> {
  const query = encodeURIComponent(address.trim());
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`,
    {
      headers: {
        "User-Agent": "2GO-MVP/1.0",
        "Accept-Language": "en",
      },
    },
  );

  if (!response.ok) {
    throw {
      statusCode: 502,
      message: "Unable to resolve pickup or destination address.",
    };
  }

  const results = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
  }>;
  const result = results[0];

  if (!result || !result.lat || !result.lon) {
    throw {
      statusCode: 400,
      message:
        "No valid map coordinates could be resolved for the provided address.",
    };
  }

  return [Number(result.lon), Number(result.lat)];
}

/**
 * Calculates Great-Circle distance between two points in Kilometers using Haversine formula
 */
export function calculateDistanceKm(
  coord1: { latitude: number; longitude: number } | [number, number], // [lng, lat]
  coord2: { latitude: number; longitude: number } | [number, number],
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
export function estimateDurationMinutes(
  distanceKm: number,
  averageSpeedKmh = 30,
): number {
  const hours = distanceKm / averageSpeedKmh;
  return Math.max(1, Math.round(hours * 60));
}
