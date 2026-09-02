import * as SecureStore from "expo-secure-store";
import { io, Socket } from "socket.io-client";

declare const process: { env: Record<string, string | undefined> };

export type UserRole = "CUSTOMER" | "DRIVER" | "OPERATIONS" | "ADMIN";
export type VehicleCategory = "STANDARD" | "COMFORT" | "PREMIUM" | "XL";
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
  driverId?: { _id: string; userId?: { name: string }; rating?: number };
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

export async function createTrip(input: {
  pickup: { address: string; coordinates: [number, number] };
  destination: { address: string; coordinates: [number, number] };
  category: VehicleCategory;
}) {
  const token = await getAccessToken();
  return request<Trip>(
    "/trips",
    { method: "POST", body: JSON.stringify(input) },
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
