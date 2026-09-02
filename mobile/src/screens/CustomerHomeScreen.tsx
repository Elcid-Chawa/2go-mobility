import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import {
  connectSocket,
  createTrip,
  estimateFare,
  FareEstimate,
  getTrip,
  Trip,
  VehicleCategory,
} from "../api";

const colors = {
  ink: "#f7fbff",
  muted: "#8796ab",
  navy: "#071120",
  panel: "#101d31",
  line: "#21304a",
  blue: "#1677ff",
};

function MapSurface() {
  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -1.6585,
          longitude: 29.2205,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
      >
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        <Marker
          coordinate={{ latitude: -1.6585, longitude: 29.2205 }}
          pinColor={colors.blue}
          title="Pickup"
        />
        <Marker
          coordinate={{ latitude: -1.6734, longitude: 29.238 }}
          pinColor="#25bd76"
          title="Destination"
        />
        <Polyline
          coordinates={[
            { latitude: -1.6585, longitude: 29.2205 },
            { latitude: -1.665, longitude: 29.23 },
            { latitude: -1.6734, longitude: 29.238 },
          ]}
          strokeColor={colors.blue}
          strokeWidth={4}
        />
      </MapView>
      <View style={styles.mapLabel}>
        <Text style={styles.mapLabelText}>OpenStreetMap</Text>
      </View>
      <TouchableOpacity style={styles.locationButton}>
        <Text style={styles.locationIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export function CustomerHomeScreen() {
  const [pickup, setPickup] = useState("Kyeshero, Goma");
  const [destination, setDestination] = useState("Katindo, Goma");
  const [category, setCategory] = useState<VehicleCategory>("STANDARD");
  const [tripState, setTripState] = useState<
    "IDLE" | "ASSIGNED" | "ON_TRIP" | "COMPLETED"
  >("IDLE");
  const [rating, setRating] = useState<number>(5);
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const coordinates = {
    pickup: {
      address: pickup,
      coordinates: [29.2205, -1.6585] as [number, number],
    },
    destination: {
      address: destination,
      coordinates: [29.238, -1.6734] as [number, number],
    },
  };

  useEffect(() => {
    estimateFare({ ...coordinates, category })
      .then(setEstimate)
      .catch((requestError) => setError(requestError.message));
  }, [category, pickup, destination]);

  useEffect(() => {
    if (
      !trip?._id ||
      trip.status === "TRIP_COMPLETED" ||
      trip.status === "CANCELLED"
    )
      return;
    const timer = setInterval(
      () =>
        getTrip(trip._id)
          .then(setTrip)
          .catch(() => undefined),
      3000,
    );
    return () => clearInterval(timer);
  }, [trip?._id, trip?.status]);
  useEffect(() => {
    if (!trip?._id) return;
    let socket: Awaited<ReturnType<typeof connectSocket>>;
    connectSocket().then((connectedSocket) => {
      socket = connectedSocket;
      socket?.emit("trip:join", trip._id);
      socket?.on("trip:assigned", () => setTripState("ASSIGNED"));
      socket?.on("trip:started", () => setTripState("ON_TRIP"));
      socket?.on("trip:completed", () => setTripState("COMPLETED"));
    });
    return () => {
      socket?.disconnect();
    };
  }, [trip?._id]);

  async function requestTrip() {
    setError("");
    try {
      const created = await createTrip({ ...coordinates, category });
      setTrip(created);
      setTripState("ASSIGNED");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request ride",
      );
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.eyebrow}>GOOD MORNING, ALICE</Text>
            <Text style={styles.title}>Where to?</Text>
          </View>
          <TouchableOpacity style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </TouchableOpacity>
        </View>
        <MapSurface />

        {tripState === "IDLE" && (
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Book a ride</Text>

            <View style={styles.searchBox}>
              <View style={styles.searchRail}>
                <View style={styles.greenDot} />
                <View style={styles.railLine} />
                <View style={styles.blueDot} />
              </View>
              <View style={styles.searchFields}>
                <TextInput
                  style={styles.locationInput}
                  value={pickup}
                  onChangeText={setPickup}
                  placeholder="Pickup location"
                  placeholderTextColor={colors.muted}
                />
                <View style={styles.fieldDivider} />
                <TextInput
                  style={styles.locationInput}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Where to?"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </View>
            <Text style={styles.sectionLabel}>Choose a ride</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rideOptions}
            >
              {(["STANDARD", "COMFORT", "PREMIUM"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.rideOption,
                    category === cat && styles.rideOptionActive,
                  ]}
                >
                  <View
                    style={[
                      styles.carGlyph,
                      category === cat && styles.carGlyphActive,
                    ]}
                  >
                    <Text style={styles.carGlyphText}>2G</Text>
                  </View>
                  <View>
                    <Text style={styles.rideName}>
                      2GO {cat[0] + cat.slice(1).toLowerCase()}
                    </Text>
                    <Text style={styles.rideMeta}>
                      {cat === "STANDARD"
                        ? "4 min"
                        : cat === "COMFORT"
                          ? "6 min"
                          : "8 min"}{" "}
                      away
                    </Text>
                  </View>
                  <Text style={styles.ridePrice}>
                    {cat === category && estimate
                      ? `RWF ${Math.round(estimate.estimatedFare).toLocaleString()}`
                      : "Calculating"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentIcon}>R</Text>
              <Text style={styles.paymentText}>Cash</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={requestTrip}
            >
              <Text style={styles.primaryButtonText}>
                Confirm 2GO {category} ·{" "}
                {estimate
                  ? `RWF ${Math.round(estimate.estimatedFare).toLocaleString()}`
                  : "Calculating..."}
              </Text>
            </TouchableOpacity>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        )}

        {tripState === "ASSIGNED" && (
          <View style={styles.sheet}>
            <View style={styles.statusLine}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>DRIVER ON THE WAY</Text>
              <Text style={styles.eta}>3 min</Text>
            </View>
            <Text style={styles.sheetTitle}>
              {trip?.status === "SEARCHING_DRIVER"
                ? "Finding your driver"
                : "Your driver is heading to you"}
            </Text>
            <Text style={styles.subText}>
              Toyota Camry · 2GO-NY-909 · ★ 4.95
            </Text>
            <View style={styles.tripRoute}>
              <Text style={styles.routeText}>Pickup · {pickup}</Text>
              <Text style={styles.routeText}>Destination · {destination}</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setTripState("ON_TRIP")}
            >
              <Text style={styles.primaryButtonText}>
                Simulate driver arrival
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {tripState === "ON_TRIP" && (
          <View style={styles.sheet}>
            <View style={[styles.statusLine, { backgroundColor: "#123c70" }]}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>TRIP IN PROGRESS</Text>
            </View>
            <Text style={styles.sheetTitle}>Heading to {destination}</Text>
            <Text style={styles.subText}>Live trip tracking is active</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setTripState("COMPLETED")}
            >
              <Text style={styles.primaryButtonText}>
                Simulate trip completion
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {tripState === "COMPLETED" && (
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Trip completed</Text>
            <Text style={styles.fare}>
              RWF{" "}
              {Math.round(
                trip?.finalFare || trip?.estimatedFare || 0,
              ).toLocaleString()}
            </Text>
            <Text style={styles.subText}>
              Cash collected · Rate your driver
            </Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Text style={styles.star}>{star <= rating ? "★" : "☆"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setTripState("IDLE")}
            >
              <Text style={styles.primaryButtonText}>Finish</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <View style={styles.bottomNav}>
        <NavItem icon="⌂" label="Home" active />
        <NavItem icon="◷" label="Activity" />
        <NavItem icon="$" label="Wallet" />
        <NavItem icon="○" label="Profile" />
      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.navItem}>
      <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingBottom: 92 },
  mapHeader: {
    position: "absolute",
    zIndex: 2,
    top: 18,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { color: colors.ink, fontSize: 28, fontWeight: "900", marginTop: 3 },
  avatar: {
    backgroundColor: colors.blue,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.ink, fontWeight: "900", fontSize: 16 },
  mapContainer: { height: 340, position: "relative" },
  map: {
    height: 340,
    backgroundColor: "#b3c8d1",
    overflow: "hidden",
    position: "relative",
  },
  road: {
    position: "absolute",
    backgroundColor: "#dbe4e5",
    height: 18,
    width: 520,
    transform: [{ rotate: "28deg" }],
  },
  roadOne: { top: 76, left: -90 },
  roadTwo: { top: 204, left: -100, transform: [{ rotate: "-18deg" }] },
  roadThree: {
    top: 270,
    left: -120,
    transform: [{ rotate: "72deg" }],
    width: 620,
  },
  route: {
    position: "absolute",
    backgroundColor: colors.blue,
    height: 5,
    borderRadius: 4,
    width: 170,
    transform: [{ rotate: "34deg" }],
  },
  routeOne: { top: 158, left: 105 },
  routeTwo: {
    top: 229,
    left: 196,
    transform: [{ rotate: "-20deg" }],
    width: 90,
  },
  pin: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 14,
    backgroundColor: colors.blue,
    borderWidth: 5,
    borderColor: "#e9f4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupPin: { top: 116, left: 102 },
  destinationPin: { top: 233, right: 82, backgroundColor: "#25bd76" },
  pinCore: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  mapLabel: {
    position: "absolute",
    top: 95,
    left: 132,
    backgroundColor: "#fff",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  mapLabelText: { color: "#152337", fontSize: 10, fontWeight: "700" },
  locationButton: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  locationIcon: { color: colors.blue, fontSize: 25, lineHeight: 26 },
  sheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -22,
    padding: 20,
    zIndex: 3,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#0b1729",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchRail: { alignItems: "center", width: 18, paddingTop: 6 },
  greenDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#2ac979",
  },
  blueDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.blue,
  },
  railLine: {
    height: 25,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.muted,
  },
  searchFields: { flex: 1 },
  locationInput: { color: colors.ink, fontSize: 14, height: 32, padding: 0 },
  fieldDivider: { height: 1, backgroundColor: colors.line },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 9,
    textTransform: "uppercase",
  },
  rideOptions: { gap: 9 },
  rideOption: {
    minWidth: 210,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b1729",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 11,
    gap: 10,
  },
  rideOptionActive: { borderColor: colors.blue, backgroundColor: "#102b51" },
  carGlyph: {
    width: 38,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#253550",
    alignItems: "center",
    justifyContent: "center",
  },
  carGlyphActive: { backgroundColor: colors.blue },
  carGlyphText: { color: colors.ink, fontSize: 10, fontWeight: "900" },
  rideName: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  rideMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  ridePrice: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: "auto",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  paymentIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#20af68",
    color: "#071120",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "900",
  },
  paymentText: { color: colors.ink, fontWeight: "700", marginLeft: 10 },
  chevron: { color: colors.muted, fontSize: 25, marginLeft: "auto" },
  primaryButton: {
    backgroundColor: colors.blue,
    minHeight: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 12,
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#123b2d",
    borderRadius: 8,
    padding: 9,
    marginBottom: 14,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#32d486",
    marginRight: 7,
  },
  statusText: {
    color: "#65e8a6",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  eta: { color: colors.ink, fontWeight: "900", marginLeft: "auto" },
  subText: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  tripRoute: {
    backgroundColor: "#0b1729",
    borderRadius: 12,
    padding: 13,
    gap: 10,
  },
  routeText: { color: "#cbd7e7", fontSize: 13 },
  fare: {
    color: colors.blue,
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 3,
  },
  ratingRow: { flexDirection: "row", gap: 13, marginVertical: 8 },
  star: { color: "#ffc857", fontSize: 30 },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: "#0b1729",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: { alignItems: "center", gap: 3, minWidth: 60 },
  navIcon: { color: colors.muted, fontSize: 21 },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  navActive: { color: colors.blue },
  card: {
    backgroundColor: "#131b2e",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#090d16",
    borderRadius: 10,
    padding: 12,
    color: "#f8fafc",
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  categoryBtn: {
    flex: 1,
    backgroundColor: "#090d16",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  categoryBtnActive: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94a3b8",
  },
  categoryTextActive: {
    color: "#22c55e",
  },
  categoryPrice: {
    fontSize: 12,
    color: "#f8fafc",
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  actionBtn: {
    backgroundColor: "#3b82f6",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
  },
  primaryBtnText: {
    color: "#090d16",
    fontWeight: "bold",
    fontSize: 15,
  },
  badgeRow: {
    alignSelf: "flex-start",
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  driverName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  vehicleInfo: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
    marginBottom: 14,
  },
  routeBox: {
    backgroundColor: "#090d16",
    padding: 12,
    borderRadius: 10,
    gap: 6,
  },
  fareSummary: {
    fontSize: 16,
    color: "#22c55e",
    fontWeight: "bold",
    marginVertical: 10,
  },
  starText: {
    fontSize: 30,
  },
  error: { color: "#ff7b86", fontSize: 12, marginTop: 10, lineHeight: 17 },
});
