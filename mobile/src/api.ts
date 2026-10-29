import * as SecureStore from "expo-secure-store";
import { File as ExpoFile, UploadType } from "expo-file-system";
import { Platform } from "react-native";
import { io, Socket } from "socket.io-client";

declare const process: { env: Record<string, string | undefined> };

export type UserRole = "CUSTOMER" | "DRIVER" | "OPERATIONS" | "ADMIN" | "RENTAL_PARTNER" | "MOVER_PARTNER";
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
  fareType: "URBAN" | "INTERCITY";
  pricingNotice?: string;
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
  waitingFare?: number;
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  cancellationReason?: string;
  createdAt?: string;
  timestamps?: { requestedAt?: string; completedAt?: string; cancelledAt?: string };
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
const RENTALS_API_URL =
  process.env.EXPO_PUBLIC_RENTALS_API_URL ||
  API_URL.replace(/:\d+\/api\/v1$/, ":5103/api/v1/car-rentals");
const MOVERS_API_URL =
  process.env.EXPO_PUBLIC_MOVERS_API_URL ||
  API_URL.replace(/:\d+\/api\/v1$/, ":5101/api/v1/movers");
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
      ...(token ? { Authorization: "Bearer " + token } : {}),
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

export type RentalCategory =
  | "ECONOMY"
  | "COMPACT"
  | "SEDAN"
  | "SUV"
  | "LUXURY"
  | "VAN";

export interface RentalVehicle {
  _id: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  category: RentalCategory;
  seats: number;
  transmission: "AUTOMATIC" | "MANUAL";
  fuel: "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC";
  city: string;
  description: string;
  photoUrl?: string;
  agency: { _id: string; name: string; address: string };
  rate: {
    currency: string;
    hourlyRate: number;
    dailyRate: number;
    weeklyRate: number;
    minimumHours: number;
    securityDeposit: number;
    chauffeurDailyRate: number;
  };
}

export interface RentalLicense {
  _id: string;
  licenseNumber: string;
  issuingCountry: string;
  expiresAt: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  reviewNotes?: string;
  documentFilename?: string;
}

export interface RentalBooking {
  _id: string;
  vehicleId: RentalVehicle | { _id: string; make: string; model: string; year: number; city: string };
  agencyId: { _id: string; name: string; phone?: string };
  driverId?: { _id: string; name: string; phone: string };
  startAt: string;
  endAt: string;
  driverOption: "SELF_DRIVE" | "WITH_DRIVER";
  billingUnit: "HOURLY" | "DAILY" | "WEEKLY";
  rentalAmount: number;
  driverAmount: number;
  securityDeposit: number;
  totalDue: number;
  currency: string;
  status: "PENDING_AGENCY" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
}

export interface RentalQuote {
  startAt: string;
  endAt: string;
  driverOption: "SELF_DRIVE" | "WITH_DRIVER";
  durationHours: number;
  billingUnit: "HOURLY" | "DAILY" | "WEEKLY";
  units: number;
  unitRate: number;
  rentalAmount: number;
  driverAmount: number;
  securityDeposit: number;
  totalDue: number;
  currency: string;
  vehicle: RentalVehicle;
  agency: RentalVehicle["agency"];
}

export type MoverVehicleType = "PICKUP" | "SMALL_VAN" | "MEDIUM_TRUCK" | "LARGE_TRUCK" | "FLATBED";
export type MoverMoveStatus = "OPEN" | "QUOTED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export interface MoverVehicle {
  _id: string;
  make: string;
  model: string;
  registrationNumber?: string;
  vehicleType: MoverVehicleType;
  capacityKg: number;
  volumeM3: number;
  crewCapacity: number;
  city: string;
  description?: string;
  status?: string;
  agency?: { _id: string; name: string; city: string; description?: string };
}
export interface MoverQuote {
  _id: string;
  amount: number;
  currency: string;
  crewCount: number;
  message: string;
  validUntil: string;
  status: "PROPOSED" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "EXPIRED";
  agencyId: { _id: string; name: string; phone?: string; city?: string };
  vehicleId: MoverVehicle;
}
export interface MoverMove {
  _id: string;
  pickupAddress: string;
  pickupCity: string;
  destinationAddress: string;
  destinationCity: string;
  scheduledAt: string;
  estimatedDurationHours: number;
  moveType: "HOUSEHOLD" | "OFFICE" | "SINGLE_ITEM";
  bedrooms: number;
  pickupFloor: number;
  destinationFloor: number;
  pickupElevator: boolean;
  destinationElevator: boolean;
  crewRequired: number;
  preferredVehicleType?: MoverVehicleType;
  inventoryNotes?: string;
  status: MoverMoveStatus;
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  quotes?: MoverQuote[];
  rating?: number;
  review?: string;
}

async function moverRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = await getAccessToken();
  if (!token) throw new Error("Sign in to continue.");
  const send = (accessToken: string) =>
    fetch(`${MOVERS_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: "Bearer " + accessToken,
      },
    });
  let response = await send(token);
  if (response.status === 401) {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error("Your session has expired. Sign in again.");
    const refreshed = await request<{ accessToken: string; refreshToken: string }>(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
    );
    await saveTokens(refreshed.accessToken, refreshed.refreshToken);
    token = refreshed.accessToken;
    response = await send(token);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "The movers request could not be completed.");
  }
  return body.data as T;
}

export async function listMoverVehicles(city = "") {
  const query = city.trim() ? `?city=${encodeURIComponent(city.trim())}` : "";
  return moverRequest<MoverVehicle[]>(`/vehicles${query}`);
}

export async function createMoverRequest(input: Record<string, unknown>) {
  return moverRequest<MoverMove>("/moves", { method: "POST", body: JSON.stringify(input) });
}

export async function getMyMoverRequests() {
  return moverRequest<MoverMove[]>("/moves/me");
}

export async function acceptMoverQuote(moveId: string, quoteId: string) {
  return moverRequest<MoverMove>(`/moves/${moveId}/quotes/${quoteId}/accept`, { method: "POST" });
}

export async function cancelMoverRequest(moveId: string) {
  return moverRequest<MoverMove>(`/moves/${moveId}/cancel`, { method: "POST" });
}

export async function reviewMoverService(moveId: string, rating: number, review: string) {
  return moverRequest<MoverMove>(`/moves/${moveId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating, review }),
  });
}

async function rentalRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token = await getAccessToken();
  if (!token) throw new Error("Sign in to continue.");
  const send = (accessToken: string) =>
    fetch(`${RENTALS_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: "Bearer " + token,
      },
    });
  let response = await send(token);
  if (response.status === 401) {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error("Your session has expired. Sign in again.");
    const refreshed = await request<{ accessToken: string; refreshToken: string }>(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken }) },
    );
    await saveTokens(refreshed.accessToken, refreshed.refreshToken);
    token = refreshed.accessToken;
    response = await send(token);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "The rental request could not be completed.");
  }
  return body.data as T;
}

export async function listRentalVehicles(input: { city?: string; category?: RentalCategory } = {}) {
  const query = new URLSearchParams();
  if (input.city?.trim()) query.set("city", input.city.trim());
  if (input.category) query.set("category", input.category);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return rentalRequest<RentalVehicle[]>(`/vehicles${suffix}`);
}

export async function getRentalLicense() {
  return rentalRequest<RentalLicense | null>("/licenses/me");
}

export async function submitRentalLicense(input: {
  licenseNumber: string;
  issuingCountry: string;
  expiresAt: string;
}) {
  return rentalRequest<RentalLicense>("/licenses/me", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadRentalLicenseDocument(asset: {
  uri: string;
  name: string;
  mimeType?: string | null;
  file?: Blob;
}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in to upload your driving licence.");
  if (Platform.OS !== "web") {
    const result = await new ExpoFile(asset.uri).upload(
      `${RENTALS_API_URL}/licenses/me/document`,
      {
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        mimeType: asset.mimeType || "application/octet-stream",
        headers: { Authorization: "Bearer " + token },
      },
    );
    let body: { success?: boolean; message?: string; data?: RentalLicense };
    try {
      body = JSON.parse(result.body) as { success?: boolean; message?: string; data?: RentalLicense };
    } catch {
      throw new Error("The rental service returned an invalid upload response.");
    }
    if (result.status < 200 || result.status >= 300 || body.success === false || !body.data) {
      throw new Error(body.message || "Unable to upload the driving licence document.");
    }
    return body.data;
  }
  if (!asset.file) throw new Error("The selected file is unavailable. Please choose it again.");
  const formData = new FormData();
  formData.append("file", asset.file, asset.name);
  const response = await fetch(`${RENTALS_API_URL}/licenses/me/document`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
    body: formData,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Unable to upload the driving licence document.");
  }
  return body.data as RentalLicense;
}

export async function quoteRental(input: {
  vehicleId: string;
  startAt: string;
  endAt: string;
  driverOption: "SELF_DRIVE" | "WITH_DRIVER";
}) {
  return rentalRequest<RentalQuote>("/quotes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createRentalBooking(input: {
  vehicleId: string;
  startAt: string;
  endAt: string;
  driverOption: "SELF_DRIVE" | "WITH_DRIVER";
  expectedRentalAmount: number;
  expectedDriverAmount: number;
  expectedSecurityDeposit: number;
  expectedTotalDue: number;
  expectedCurrency: string;
}) {
  return rentalRequest<RentalBooking>("/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function cancelRentalBooking(bookingId: string) {
  return rentalRequest<RentalBooking>(`/bookings/${bookingId}/cancel`, {
    method: "POST",
  });
}

export async function getMyRentalBookings() {
  return rentalRequest<RentalBooking[]>("/bookings/me");
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
  routedDistanceKm?: number;
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
  routedDistanceKm?: number;
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

export interface CustomerProfile {
  _id: string;
  userId: AuthUser;
  savedPlaces: Array<{
    _id?: string;
    name: string;
    address: string;
    location: { coordinates: [number, number] };
  }>;
  trustedContacts: Array<{ _id?: string; name: string; phone: string }>;
}

export type OnboardingDocumentKind =
  | "profilePhoto"
  | "vehiclePreviewImage"
  | "idDocument"
  | "drivingLicense"
  | "vehicleRegistration"
  | "insuranceCertificate";

export interface DriverOnboarding {
  _id: string;
  onboardingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  verificationStatus:
    | "NOT_VERIFIED"
    | "VERIFICATION_IN_PROGRESS"
    | "VERIFIED"
    | "REJECTED";
  personalInfo: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    idDocumentType?: string;
    idDocumentNumber?: string;
    drivingLicenseNumber?: string;
    drivingLicenseExpiryDate?: string;
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  vehicleInfo: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    licensePlate?: string;
    vin?: string;
    category?: VehicleCategory;
  };
  documents: Partial<Record<OnboardingDocumentKind, string>>;
  review?: { notes?: string; rejectionReason?: string; reviewedAt?: string };
}

export async function getDriverOnboarding() {
  const token = await getAccessToken();
  return request<DriverOnboarding>(
    "/driver-onboarding/me",
    {},
    token || undefined,
  );
}

export async function saveDriverOnboardingDraft(
  input: Omit<DriverOnboarding, "_id" | "onboardingStatus" | "verificationStatus" | "review">,
) {
  const token = await getAccessToken();
  return request<DriverOnboarding>(
    "/driver-onboarding/draft",
    { method: "PUT", body: JSON.stringify(input) },
    token || undefined,
  );
}

export async function uploadDriverOnboardingFile(
  kind: OnboardingDocumentKind,
  asset: {
    uri: string;
    name: string;
    mimeType?: string | null;
    file?: Blob;
  },
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in to upload your documents.");

  if (Platform.OS !== "web") {
    const result = await new ExpoFile(asset.uri).upload(
      `${API_URL}/driver-onboarding/files`,
      {
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        mimeType: asset.mimeType || "application/octet-stream",
      headers: { Authorization: "Bearer " + token },
        parameters: { kind },
      },
    );
    let body: { success?: boolean; message?: string; data?: DriverOnboarding };
    try {
      body = JSON.parse(result.body);
    } catch {
      body = {};
    }
    if (result.status < 200 || result.status >= 300 || body.success === false) {
      throw new Error(body.message || "Unable to upload that file.");
    }
    return body.data as DriverOnboarding;
  }

  if (!asset.file) {
    throw new Error("The selected file is unavailable. Please choose it again.");
  }
  const formData = new FormData();
  formData.append("kind", kind);
  formData.append("file", asset.file, asset.name);
  const response = await fetch(`${API_URL}/driver-onboarding/files`, {
    method: "POST",
      headers: { Authorization: "Bearer " + token },
    body: formData,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "Unable to upload that file.");
  }
  return body.data as DriverOnboarding;
}

export async function submitDriverOnboarding() {
  const token = await getAccessToken();
  return request<DriverOnboarding>(
    "/driver-onboarding/submit",
    { method: "POST" },
    token || undefined,
  );
}

export async function getActiveTrip() {
  const token = await getAccessToken();
  return request<Trip | null>("/trips/active", {}, token || undefined);
}

export async function getTripHistory() {
  const token = await getAccessToken();
  return request<Trip[]>("/trips/history", {}, token || undefined);
}

export async function getCustomerProfile() {
  const token = await getAccessToken();
  return request<CustomerProfile>("/customers/me", {}, token || undefined);
}

export async function updateCustomerProfile(input: { name?: string; phone?: string }) {
  const token = await getAccessToken();
  return request<CustomerProfile>(
    "/customers/me",
    { method: "PATCH", body: JSON.stringify(input) },
    token || undefined,
  );
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

export async function cancelTrip(tripId: string, reason: string) {
  const token = await getAccessToken();
  return request<Trip>(
    `/trips/${tripId}/cancel`,
    { method: "POST", body: JSON.stringify({ reason }) },
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
