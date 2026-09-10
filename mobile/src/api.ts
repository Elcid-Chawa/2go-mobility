import * as SecureStore from "expo-secure-store";
import { io, Socket } from "socket.io-client";

declare const process: { env: Record<string, string | undefined> };

export type UserRole = "CUSTOMER" | "DRIVER" | "OPERATIONS" | "ADMIN";
export type VehicleCategory = "STANDARD" | "COMFORT" | "PREMIUM" | "XL";
export type PaymentMethod = "CASH" | "CARD" | "MOBILE_MONEY";
export type TripStatus =
  | "REQUESTED"
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ACCEPTED"
  | "DRIVER_ARRIVED"
  | "TRIP_STARTED"
  | "TRIP_COMPLETED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "RATED"
  | "CANCELLED";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
}

interface AuthResult {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string };
}

export interface FareEstimate {
  category: VehicleCategory;
  distanceKm: number;
  estimatedDurationMinutes: number;
  estimatedFare: number;
  currency: string;
}

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  coordinates: MapCoordinate[];
  distanceKm: number;
  durationMinutes: number;
}

export interface LocationSuggestion {
  id: string;
  label: string;
  coordinate: MapCoordinate;
}

export interface NearbyDriver {
  driverId: string;
  name?: string;
  rating: number;
  heading: number;
  category?: VehicleCategory;
  location: { coordinates: [number, number] };
  lastLocationUpdate?: string;
}
export interface Trip {
  _id: string;
  status: TripStatus;
  category: VehicleCategory;
  estimatedFare: number;
  finalFare?: number;
  distanceKm: number;
  estimatedDurationMinutes: number;
  pickup: { address: string; location: { coordinates: [number, number] } };
  destination: { address: string; location: { coordinates: [number, number] } };
  customerId?: { userId?: { name: string } };
  driverId?: {
    _id: string;
    userId?: { name: string };
    rating?: number;
    activeVehicleId?: { make?: string; model?: string; plateNumber?: string };
  };
}

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.69:5000/api/v1";
const ACCESS_TOKEN_KEY = "2go.accessToken";
const REFRESH_TOKEN_KEY = "2go.refreshToken";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "The request could not be completed");
  }
  return body.data as T;
}

async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function login(email: string, password: string) {
  const result = await request<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await saveTokens(result.tokens.accessToken, result.tokens.refreshToken);
  return result.user;
}

export async function register(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "CUSTOMER" | "DRIVER";
}) {
  const result = await request<AuthResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  await saveTokens(result.tokens.accessToken, result.tokens.refreshToken);
  return result.user;
}

export async function restoreSession() {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const result = await request<{ user: AuthUser }>(
      "/auth/me",
      {},
      accessToken,
    );
    return result.user;
  } catch {
    await logout();
    return null;
  }
}

export async function logout() {
  const accessToken = await getAccessToken();
  if (accessToken) {
    await request("/auth/logout", { method: "POST" }, accessToken).catch(
      () => undefined,
    );
  }
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function estimateFare(input: {
  pickup: { address: string; coordinates: [number, number] };
  destination: { address: string; coordinates: [number, number] };
  category: VehicleCategory;
}) {
  return request<FareEstimate>("/pricing/estimate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function geocodeAddress(address: string): Promise<MapCoordinate> {
  const query = encodeURIComponent(address.trim());
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`,
    {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "2GO-Mobile/1.0",
      },
    },
  );
  if (!response.ok) throw new Error("Unable to resolve that address");

  const results = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
  }>;
  const result = results[0];
  if (!result?.lat || !result.lon) {
    throw new Error("No map location found for that address");
  }

  return { latitude: Number(result.lat), longitude: Number(result.lon) };
}

export async function searchLocationSuggestions(
  address: string,
): Promise<LocationSuggestion[]> {
  const query = encodeURIComponent(address.trim());
  if (!address.trim()) return [];
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${query}`,
    {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "2GO-Mobile/1.0",
      },
    },
  );
  if (!response.ok) throw new Error("Unable to search locations");
  const results = (await response.json()) as Array<{
    place_id?: number;
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;
  return results.flatMap((result) => {
    if (!result.place_id || !result.display_name || !result.lat || !result.lon)
      return [];
    return [
      {
        id: String(result.place_id),
        label: result.display_name,
        coordinate: {
          latitude: Number(result.lat),
          longitude: Number(result.lon),
        },
      },
    ];
  });
}

export async function reverseGeocode(
  coordinate: MapCoordinate,
): Promise<string> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinate.latitude}&lon=${coordinate.longitude}`,
    {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "2GO-Mobile/1.0",
      },
    },
  );
  if (!response.ok) throw new Error("Unable to identify this map location");
  const result = (await response.json()) as { display_name?: string };
  return (
    result.display_name ||
    `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`
  );
}

export async function getRoute(
  pickup: MapCoordinate,
  destination: MapCoordinate,
): Promise<RouteResult> {
  const coordinates = `${pickup.longitude},${pickup.latitude};${destination.longitude},${destination.latitude}`;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
  );
  if (!response.ok) throw new Error("Unable to calculate a driving route");

  const body = (await response.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { coordinates: Array<[number, number]> };
    }>;
  };
  const route = body.routes?.[0];
  if (!route) throw new Error("No driving route found");

  return {
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
      latitude,
      longitude,
    })),
    distanceKm: route.distance / 1000,
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
  };
}

export async function getNearbyDrivers(
  location: MapCoordinate,
  radiusKm = 10,
  category?: VehicleCategory,
): Promise<NearbyDriver[]> {
  const params = new URLSearchParams({
    longitude: String(location.longitude),
    latitude: String(location.latitude),
    radiusKm: String(radiusKm),
  });
  if (category) params.set("category", category);
  const token = await getAccessToken();
  return request<NearbyDriver[]>(
    `/drivers/nearby?${params.toString()}`,
    {},
    token || undefined,
  );
}

export async function createTrip(input: {
  pickup: { address: string; coordinates: [number, number] };
  destination: { address: string; coordinates: [number, number] };
  category: VehicleCategory;
  paymentMethod: PaymentMethod;
}) {
  const token = await getAccessToken();
  return request<Trip>(
    "/trips",
    { method: "POST", body: JSON.stringify(input) },
    token || undefined,
  );
}

export async function recordTripPayment(tripId: string, method: PaymentMethod) {
  const token = await getAccessToken();
  return request(
    `/trips/${tripId}/payment`,
    {
      method: "POST",
      body: JSON.stringify({ method }),
    },
    token || undefined,
  );
}

export async function rateTrip(
  tripId: string,
  score: number,
  comment?: string,
) {
  const token = await getAccessToken();
  return request(
    `/trips/${tripId}/rating`,
    {
      method: "POST",
      body: JSON.stringify({ score, comment }),
    },
    token || undefined,
  );
}

export async function getTrip(tripId: string) {
  const token = await getAccessToken();
  return request<Trip>(`/trips/${tripId}`, {}, token || undefined);
}

export async function driverStatus(input: {
  onlineStatus?: "ONLINE" | "OFFLINE";
  availabilityStatus?: "AVAILABLE" | "BUSY" | "ON_TRIP";
}) {
  const token = await getAccessToken();
  return request(
    "/drivers/me/status",
    { method: "PATCH", body: JSON.stringify(input) },
    token || undefined,
  );
}

export async function getDriverProfile() {
  const token = await getAccessToken();
  return request<any>("/drivers/me", {}, token || undefined);
}

export async function getDriverEarnings() {
  const token = await getAccessToken();
  return request<{
    totalEarnings: number;
    totalTrips: number;
    rating: number;
    currency: string;
  }>("/drivers/me/earnings", {}, token || undefined);
}

export async function driverLocation(
  coordinates: [number, number],
  heading = 0,
) {
  const token = await getAccessToken();
  return request(
    "/drivers/me/location",
    { method: "POST", body: JSON.stringify({ coordinates, heading }) },
    token || undefined,
  );
}

export async function tripAction(
  tripId: string,
  action: "accept" | "reject" | "arrive" | "start" | "complete",
) {
  const token = await getAccessToken();
  return request<Trip | null>(
    `/trips/${tripId}/${action}`,
    { method: "POST" },
    token || undefined,
  );
}

export async function recordTripLocation(
  tripId: string,
  coordinates: [number, number],
  heading = 0,
  speed = 0,
) {
  const token = await getAccessToken();
  return request(
    `/trips/${tripId}/location`,
    { method: "POST", body: JSON.stringify({ coordinates, heading, speed }) },
    token || undefined,
  );
}

export async function connectSocket(): Promise<Socket | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const socketUrl = API_URL.replace(/\/api\/v1$/, "");
  return io(socketUrl, { transports: ["websocket"], auth: { token } });
}

export { API_URL };
