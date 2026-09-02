import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import {
  connectSocket,
  driverLocation,
  driverStatus,
  tripAction,
} from "../api";

function DriverMap() {
  return (
    <View style={styles.driverMapContainer}>
      <MapView
        style={styles.driverMap}
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
          pinColor="#1677ff"
          title="Your location"
        />
        <Marker
          coordinate={{ latitude: -1.6734, longitude: 29.238 }}
          pinColor="#25bd76"
          title="Pickup"
        />
        <Polyline
          coordinates={[
            { latitude: -1.6585, longitude: 29.2205 },
            { latitude: -1.665, longitude: 29.23 },
            { latitude: -1.6734, longitude: 29.238 },
          ]}
          strokeColor="#1677ff"
          strokeWidth={4}
        />
      </MapView>
      <View style={styles.driverMapTitle}>
        <Text style={styles.driverMapKicker}>CURRENT AREA</Text>
        <Text style={styles.driverMapName}>Kyeshero, Goma</Text>
      </View>
    </View>
  );
}

export function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const [driverState, setDriverState] = useState<
    "IDLE" | "OFFER" | "ACCEPTED" | "ARRIVED" | "IN_TRIP"
  >("IDLE");
  const [offerId, setOfferId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let socket: Awaited<ReturnType<typeof connectSocket>>;
    connectSocket().then((connectedSocket) => {
      socket = connectedSocket;
      socket?.on("trip:offer", (offer: { tripId: string }) => {
        setOfferId(offer.tripId);
        setDriverState("OFFER");
        socket?.emit("trip:join", offer.tripId);
      });
    });
    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    let watcher: Location.LocationSubscription | undefined;
    async function watchDriver() {
      if (!isOnline) return;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Location permission is required to go online");
        return;
      }
      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 50,
        },
        (position) => {
          const { longitude, latitude, heading } = position.coords;
          driverLocation([longitude, latitude], heading || 0).catch(
            () => undefined,
          );
        },
      );
    }
    watchDriver();
    return () => watcher?.remove();
  }, [isOnline]);

  async function toggleOnline() {
    const nextOnline = !isOnline;
    try {
      await driverStatus({
        onlineStatus: nextOnline ? "ONLINE" : "OFFLINE",
        availabilityStatus: nextOnline ? "AVAILABLE" : "AVAILABLE",
      });
      setIsOnline(nextOnline);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update availability",
      );
    }
  }

  async function performAction(
    action: "accept" | "reject" | "arrive" | "start" | "complete",
  ) {
    if (!offerId) return;
    try {
      await tripAction(offerId, action);
      setDriverState(
        action === "accept"
          ? "ACCEPTED"
          : action === "arrive"
            ? "ARRIVED"
            : action === "start"
              ? "IN_TRIP"
              : "IDLE",
      );
      if (action === "reject" || action === "complete") setOfferId(null);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Trip action failed",
      );
    }
  }

  return (
    <View style={styles.driverScreen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <DriverMap />
        <View style={styles.header}>
          <Text style={styles.appName}>2GO DRIVER</Text>
          <Text style={styles.driverName}>Bob Chauffeur</Text>
        </View>

        {/* Online/Offline Toggle Card */}
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusLabel}>Availability Status</Text>
            <Text
              style={[
                styles.statusValue,
                isOnline ? styles.onlineText : styles.offlineText,
              ]}
            >
              {isOnline ? "🟢 YOU ARE ONLINE" : "🔴 YOU ARE OFFLINE"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              isOnline ? styles.goOfflineBtn : styles.goOnlineBtn,
            ]}
            onPress={toggleOnline}
          >
            <Text style={styles.toggleBtnText}>
              {isOnline ? "Go Offline" : "Go Online"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Overview */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>RWF 142,500</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Trips Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>⭐ 4.95</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Ride Offer Modal / Card */}
        {isOnline && driverState === "OFFER" && offerId && (
          <View style={[styles.card, styles.offerCard]}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>⚡ NEW RIDE OFFER (15s)</Text>
            </View>
            <Text style={styles.offerFare}>RWF 15,420</Text>
            <Text style={styles.offerMeta}>
              1.24 km • 4 mins • Standard Category
            </Text>

            <View style={styles.routeBox}>
              <Text style={styles.routeItem}>
                🟢 Pickup: Empire State Building
              </Text>
              <Text style={styles.routeItem}>
                🏁 Dest: Grand Central Terminal
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                onPress={() => performAction("reject")}
              >
                <Text style={styles.rejectBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.acceptBtn]}
                onPress={() => performAction("accept")}
              >
                <Text style={styles.acceptBtnText}>Accept Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Accepted State */}
        {driverState === "ACCEPTED" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>En Route to Pickup</Text>
            <Text style={styles.passengerText}>
              Passenger: Alice Rider (Empire State Building)
            </Text>
            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn, { marginTop: 14 }]}
              onPress={() => performAction("arrive")}
            >
              <Text style={styles.acceptBtnText}>Mark Arrived at Pickup</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Arrived State */}
        {driverState === "ARRIVED" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Arrived at Pickup</Text>
            <Text style={styles.passengerText}>Waiting for Alice Rider...</Text>
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: "#0284c7", marginTop: 14 },
              ]}
              onPress={() => performAction("start")}
            >
              <Text style={styles.acceptBtnText}>
                Start Trip to Grand Central
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* In-Trip State */}
        {driverState === "IN_TRIP" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trip In Progress</Text>
            <Text style={styles.passengerText}>
              Destination: Grand Central Terminal
            </Text>
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: "#10b981", marginTop: 14 },
              ]}
              onPress={() => performAction("complete")}
            >
              <Text style={styles.acceptBtnText}>
                Complete Trip & Collect Cash (RWF 15,420)
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.bottomNav}>
        <DriverNavItem icon="⌂" label="Home" active />
        <DriverNavItem icon="◷" label="Trips" />
        <DriverNavItem icon="$" label="Earnings" />
        <DriverNavItem icon="○" label="Profile" />
      </View>
    </View>
  );
}

function DriverNavItem({
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
  driverScreen: { flex: 1, backgroundColor: "#071120" },
  driverMapContainer: {
    height: 215,
    position: "relative",
    marginHorizontal: -20,
    marginTop: -20,
  },
  driverMap: {
    height: 215,
    backgroundColor: "#b3c8d1",
    overflow: "hidden",
    position: "relative",
    marginHorizontal: -20,
    marginTop: -20,
  },
  mapRoad: {
    position: "absolute",
    backgroundColor: "#dbe4e5",
    height: 17,
    width: 520,
    transform: [{ rotate: "25deg" }],
  },
  mapRoadOne: { top: 55, left: -120 },
  mapRoadTwo: { top: 140, left: -90, transform: [{ rotate: "-20deg" }] },
  mapRoadThree: {
    top: 180,
    left: 20,
    transform: [{ rotate: "70deg" }],
    width: 430,
  },
  mapRoute: {
    position: "absolute",
    backgroundColor: "#1677ff",
    height: 5,
    borderRadius: 4,
    width: 145,
    transform: [{ rotate: "30deg" }],
  },
  mapRouteOne: { top: 85, left: 85 },
  mapRouteTwo: {
    top: 137,
    left: 188,
    transform: [{ rotate: "-19deg" }],
    width: 90,
  },
  driverPin: {
    position: "absolute",
    width: 27,
    height: 27,
    borderRadius: 15,
    backgroundColor: "#1677ff",
    borderWidth: 5,
    borderColor: "#eff8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  driverPinStart: { top: 62, left: 80 },
  driverPinEnd: { top: 146, right: 76, backgroundColor: "#25bd76" },
  pinMark: { color: "#fff", fontSize: 15, fontWeight: "900", lineHeight: 15 },
  driverMapTitle: {
    position: "absolute",
    top: 17,
    right: 18,
    backgroundColor: "#071120",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  driverMapKicker: {
    color: "#7790aa",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  driverMapName: {
    color: "#f7fbff",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: "#0b1729",
    borderTopWidth: 1,
    borderTopColor: "#21304a",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: { alignItems: "center", gap: 3, minWidth: 60 },
  navIcon: { color: "#8796ab", fontSize: 21 },
  navLabel: { color: "#8796ab", fontSize: 10, fontWeight: "700" },
  navActive: { color: "#30c979" },
  container: {
    padding: 20,
    backgroundColor: "#090d16",
    flexGrow: 1,
    paddingBottom: 90,
  },
  header: {
    marginBottom: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#30c979",
  },
  driverName: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 2,
  },
  statusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#131b2e",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  onlineText: { color: "#22c55e" },
  offlineText: { color: "#ef4444" },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  goOfflineBtn: { backgroundColor: "#ef4444" },
  goOnlineBtn: { backgroundColor: "#22c55e" },
  toggleBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#131b2e",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#131b2e",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  offerCard: {
    borderColor: "#1677ff",
    backgroundColor: "rgba(22, 119, 255, 0.08)",
  },
  offerBadge: {
    backgroundColor: "#1677ff",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  offerBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  offerFare: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff",
  },
  offerMeta: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 12,
  },
  routeBox: {
    backgroundColor: "#090d16",
    padding: 10,
    borderRadius: 8,
    gap: 4,
    marginBottom: 16,
  },
  routeItem: {
    fontSize: 12,
    color: "#cbd5e1",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectBtn: { backgroundColor: "#334155" },
  acceptBtn: { backgroundColor: "#22c55e" },
  rejectBtnText: { color: "#ffffff", fontWeight: "bold" },
  acceptBtnText: { color: "#090d16", fontWeight: "bold" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
  passengerText: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  error: { color: "#ff7b86", fontSize: 12, marginTop: 10, lineHeight: 17 },
});
