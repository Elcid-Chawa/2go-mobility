import React, { useEffect, useState } from "react";
import { PersonCard, RouteCard, ui } from "../design";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Vibration,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import {
  connectSocket,
  cancelTrip,
  driverLocation,
  driverStatus,
  getDriverEarnings,
  getActiveTrip,
  getDriverProfile,
  getTrip,
  getRoute,
  MapCoordinate,
  Trip,
  tripAction,
} from "../api";

function toMapCoordinate([longitude, latitude]: [
  number,
  number,
]): MapCoordinate {
  return { latitude, longitude };
}

function DriverMap({
  location,
  pickup,
}: {
  location: MapCoordinate | null;
  pickup: MapCoordinate | null;
}) {
  const [route, setRoute] = useState<MapCoordinate[]>([]);
  useEffect(() => {
    let active = true;
    setRoute([]);
    if (location && pickup) {
      getRoute(location, pickup)
        .then(result => { if (active) setRoute(result.coordinates); })
        .catch(() => undefined);
    }
    return () => { active = false; };
  }, [location?.latitude, location?.longitude, pickup?.latitude, pickup?.longitude]);
  const center = location ||
    pickup || { latitude: -1.6585, longitude: 29.2205 };
  return (
    <View style={styles.driverMapContainer}>
      <MapView
        userInterfaceStyle="dark"
        style={styles.driverMap}
        region={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {location && (
          <Marker
            coordinate={location}
            pinColor="#00d4ed"
            title="Your location"
          />
        )}
        {pickup && (
          <Marker coordinate={pickup} pinColor="#25bd76" title="Pickup" />
        )}
        {route.length > 1 && <Polyline coordinates={route} strokeColor="#00d4ed" strokeWidth={5} />}
      </MapView>
      <View style={styles.driverMapTitle}>
        <Text style={styles.driverMapKicker}>© OpenStreetMap contributors</Text>
        <Text style={styles.driverMapName}>
          {location ? "Location active" : "Locating..."}
        </Text>
      </View>
    </View>
  );
}

export function DriverHomeScreen({ userName }: { userName: string }) {
  const [activeTab, setActiveTab] = useState<"Rides" | "Earnings">("Rides");
  const [isOnline, setIsOnline] = useState(false);
  const [driverState, setDriverState] = useState<
    "IDLE" | "OFFER" | "ACCEPTED" | "ARRIVED" | "IN_TRIP" | "COMPLETED"
  >("IDLE");
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerTrip, setOfferTrip] = useState<Trip | null>(null);
  const [currentLocation, setCurrentLocation] = useState<MapCoordinate | null>(
    null,
  );
  const [error, setError] = useState("");
  const [earnings, setEarnings] = useState<{
    totalEarnings: number;
    totalTrips: number;
    rating: number;
    currency: string;
  } | null>(null);

  function showTrip(trip: Trip, notify = false) {
    setOfferId(trip._id);
    setOfferTrip(trip);
    setDriverState(
      trip.status === "DRIVER_ASSIGNED"
        ? "OFFER"
        : trip.status === "DRIVER_ACCEPTED"
          ? "ACCEPTED"
          : trip.status === "DRIVER_ARRIVED"
            ? "ARRIVED"
            : trip.status === "TRIP_STARTED"
              ? "IN_TRIP"
              : trip.status === "TRIP_COMPLETED" || trip.status === "PAID"
                ? "COMPLETED"
                : "IDLE",
    );
    if (notify && trip.status === "DRIVER_ASSIGNED") {
      Vibration.vibrate([0, 500, 250, 500]);
      Alert.alert(
        "New ride request",
        `${trip.pickup.address}\nRWF ${Math.round(trip.estimatedFare).toLocaleString()}`,
        [{ text: "View request" }],
      );
    }
  }

  function clearCurrentRide() {
    setOfferId(null);
    setOfferTrip(null);
    setDriverState("IDLE");
  }

  function confirmDriverCancellation() {
    if (!offerId) return;
    Alert.alert(
      "Cancel accepted ride?",
      "Use this only when you cannot safely complete the pickup. The rider will be notified immediately.",
      [
        { text: "Keep ride", style: "cancel" },
        {
          text: "Cancel ride",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelTrip(offerId, "Driver unable to complete pickup");
              clearCurrentRide();
            } catch (cancelError) {
              setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel ride");
            }
          },
        },
      ],
    );
  }

  useEffect(() => {
    Promise.all([getDriverProfile(), getDriverEarnings(), getActiveTrip()])
      .then(([profile, driverEarnings, activeTrip]) => {
        setIsOnline(profile.onlineStatus === "ONLINE");
        setEarnings(driverEarnings);
        if (activeTrip) showTrip(activeTrip);
      })
      .catch(() => setError("Unable to load driver profile"));
  }, []);

  useEffect(() => {
    let socket: Awaited<ReturnType<typeof connectSocket>>;
    connectSocket().then((connectedSocket) => {
      socket = connectedSocket;
      socket?.on("connect", () => {
        getActiveTrip().then((activeTrip) => {
          if (activeTrip) showTrip(activeTrip);
        }).catch(() => undefined);
      });
      socket?.on("trip:offer", (offer: { tripId: string }) => {
        getTrip(offer.tripId)
          .then((trip) => showTrip(trip, true))
          .catch(() => undefined);
        socket?.emit("trip:join", offer.tripId);
      });
      socket?.on("trip:offer_expired", ({ tripId }: { tripId: string }) => {
        setOfferId((current) => {
          if (current === tripId) {
            setOfferTrip(null);
            setDriverState("IDLE");
            return null;
          }
          return current;
        });
      });
      socket?.on("trip:cancelled", (event: { cancelledBy?: string }) => {
        clearCurrentRide();
        if (event.cancelledBy === "CUSTOMER") {
          Alert.alert("Ride cancelled", "The rider cancelled this request. You are available for another ride.");
        }
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
          setCurrentLocation({ latitude, longitude });
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
              : action === "complete" ? "COMPLETED" : "IDLE",
      );
      if (action === "complete") {
        getTrip(offerId).then(setOfferTrip).catch(() => undefined);
        getDriverEarnings().then(setEarnings).catch(() => undefined);
      }
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
        {activeTab === "Rides" && driverState !== "COMPLETED" && <DriverMap
          location={currentLocation}
          pickup={
            offerTrip
              ? toMapCoordinate(driverState === "IN_TRIP" ? offerTrip.destination.location.coordinates : offerTrip.pickup.location.coordinates)
              : null
          }
        />}
        <View style={[styles.header, {marginTop: 16}]}>
          <Text style={styles.appName}>{activeTab === "Earnings" ? "Your earnings" : driverState === "IN_TRIP" ? "On the way" : "Request radar"}</Text>
          <Text style={styles.driverName}>{userName}</Text>
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
            <Text style={styles.statNumber}>
              {earnings
                ? `${earnings.currency} ${earnings.totalEarnings.toLocaleString()}`
                : "--"}
            </Text>
            <Text style={styles.statLabel}>Total earnings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {earnings?.totalTrips ?? "--"}
            </Text>
            <Text style={styles.statLabel}>Trips Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {earnings ? `⭐ ${earnings.rating.toFixed(1)}` : "⭐ --"}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Ride Offer Modal / Card */}
        {isOnline && driverState === "OFFER" && offerId && (
          <View style={[styles.card, styles.offerCard]}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>⚡ NEW RIDE REQUEST</Text>
            </View>
            <View style={ui.handle}/><Text style={ui.label}>ESTIMATED TRIP FARE</Text>
            <Text style={styles.offerFare}>
              RWF{" "}
              {offerTrip
                ? Math.round(offerTrip.estimatedFare).toLocaleString()
                : "--"}
            </Text>
            <Text style={styles.offerMeta}>
              {offerTrip
                ? `${offerTrip.distanceKm.toFixed(2)} km • ${offerTrip.estimatedDurationMinutes} mins • ${offerTrip.category}`
                : "Loading trip details..."}
            </Text>

            <PersonCard name={offerTrip?.customerId?.userId?.name || "Your rider"} detail="2Go passenger"/>
            <RouteCard pickup={offerTrip?.pickup.address || "Loading pickup..."} destination={offerTrip?.destination.address || "Loading destination..."}/>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn, {flex: 1}]}
                onPress={() => performAction("reject")}
              >
                <Text style={styles.rejectBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.acceptBtn, {flex: 2}]}
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
              Passenger trip: {offerTrip?.pickup.address || "Pickup location"}
            </Text>
            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn, { marginTop: 14 }]}
              onPress={() => performAction("arrive")}
            >
              <Text style={styles.acceptBtnText}>Mark Arrived at Pickup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelRideButton} onPress={confirmDriverCancellation}>
              <Text style={styles.cancelRideText}>Cancel accepted ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Arrived State */}
        {driverState === "ARRIVED" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Arrived at Pickup</Text>
            <Text style={styles.passengerText}>
              Waiting for {offerTrip?.customerId?.userId?.name || "customer"}...
            </Text>
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: "#00d4ed", marginTop: 14 },
              ]}
              onPress={() => performAction("start")}
            >
              <Text style={styles.acceptBtnText}>
                Start Trip to {offerTrip?.destination.address || "destination"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelRideButton} onPress={confirmDriverCancellation}>
              <Text style={styles.cancelRideText}>Cancel before trip starts</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* In-Trip State */}
        {driverState === "IN_TRIP" && (
          <View style={styles.card}>
            <View style={ui.handle}/><Text style={styles.cardTitle}>{offerTrip?.estimatedDurationMinutes} MIN · {offerTrip?.distanceKm.toFixed(1)} KM</Text><PersonCard name={offerTrip?.customerId?.userId?.name || "Your rider"} detail="Trip in progress"/><RouteCard pickup={offerTrip?.pickup.address || "Pickup"} destination={offerTrip?.destination.address || "Destination"}/>
            <Text style={styles.passengerText}>
              Destination: {offerTrip?.destination.address || "destination"}
            </Text>
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: "#39e6b0", marginTop: 14 },
              ]}
              onPress={() => performAction("complete")}
            >
              <Text style={styles.acceptBtnText}>
                Complete Trip & Collect Cash (RWF{" "}
                {offerTrip
                  ? Math.round(offerTrip.estimatedFare).toLocaleString()
                  : "--"}
                )
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {driverState === "COMPLETED" && <View style={styles.card}>
          <View style={ui.success}><Text style={ui.check}>✓</Text><Text style={ui.successTitle}>Trip completed!</Text><Text style={ui.muted}>Your trip summary</Text></View>
          <RouteCard pickup={offerTrip?.pickup.address || "Pickup"} destination={offerTrip?.destination.address || "Destination"}/>
          <View style={ui.receipt}><Text style={ui.label}>TRIP FARE</Text><Text style={ui.total}>RWF {Math.round(offerTrip?.finalFare ?? offerTrip?.estimatedFare ?? 0).toLocaleString()}</Text><View style={ui.receiptRow}><Text style={ui.muted}>Distance</Text><Text style={ui.body}>{offerTrip?.distanceKm.toFixed(1)} km</Text></View><Text style={ui.muted}>Payment status: {offerTrip?.status === "PAID" || offerTrip?.status === "RATED" ? "Paid" : "Awaiting payment confirmation"}</Text></View>
          <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => {setDriverState("IDLE"); setOfferTrip(null); setActiveTab("Rides");}}><Text style={styles.acceptBtnText}>Find next trip</Text></TouchableOpacity>
        </View>}
        {activeTab === "Earnings" && <View style={styles.card}><Text style={ui.label}>EARNINGS OVERVIEW</Text><Text style={ui.total}>{earnings ? `${earnings.currency} ${earnings.totalEarnings.toLocaleString()}` : "Loading…"}</Text><Text style={ui.footnote}>Earnings from your completed trips.</Text></View>}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.bottomNav}>
        <DriverNavItem icon="◎" label="Rides" active={activeTab === "Rides"} onPress={() => setActiveTab("Rides")} />
        <DriverNavItem icon="▣" label="Earnings" active={activeTab === "Earnings"} onPress={() => setActiveTab("Earnings")} />
      </View>
    </View>
  );
}

function DriverNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity accessibilityRole="tab" accessibilityState={{selected: active}} onPress={onPress} style={styles.navItem}>
      <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  driverScreen: { flex: 1, backgroundColor: "#0e1519" },
  driverMapContainer: {
    height: 390,
    position: "relative",
    marginHorizontal: 0,
    marginTop: 0,
  },
  driverMap: {
    height: 390,
    backgroundColor: "#1d282d",
    overflow: "hidden",
    position: "relative",
    marginHorizontal: 0,
    marginTop: 0,
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
    backgroundColor: "#00d4ed",
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
    backgroundColor: "#00d4ed",
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
    backgroundColor: "#171e22",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  driverMapKicker: {
    color: "#92a1a9",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  driverMapName: {
    color: "#eaf2f4",
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
    backgroundColor: "#171e22",
    borderTopWidth: 1,
    borderTopColor: "#242c31",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: { alignItems: "center", gap: 3, minWidth: 60 },
  navIcon: { color: "#8796ab", fontSize: 21 },
  navLabel: { color: "#8796ab", fontSize: 10, fontWeight: "700" },
  navActive: { color: "#00d4ed" },
  container: {
    padding: 20,
    backgroundColor: "#0e1519",
    flexGrow: 1,
    paddingBottom: 90,
  },
  header: {
    marginBottom: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#39e6b0",
  },
  driverName: {
    fontSize: 16,
    color: "#92a1a9",
    marginTop: 2,
  },
  statusCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#171e22",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#263238",
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 11,
    color: "#92a1a9",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 2,
  },
  onlineText: { color: "#39e6b0" },
  offlineText: { color: "#ff8b91" },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  goOfflineBtn: { backgroundColor: "#5a3036" },
  goOnlineBtn: { backgroundColor: "#123b35" },
  toggleBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#171e22",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#263238",
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
    backgroundColor: "#171e22",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#263238",
    marginBottom: 16,
  },
  offerCard: {
    borderColor: "#00d4ed",
    backgroundColor: "#171e22",
  },
  offerBadge: {
    backgroundColor: "#00d4ed",
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
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
  },
  offerMeta: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 12,
  },
  routeBox: {
    backgroundColor: "#0e1519",
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
    minHeight: 56,
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  rejectBtn: { backgroundColor: "#334155" },
  acceptBtn: { backgroundColor: "#00d4ed" },
  rejectBtnText: { color: "#ffffff", fontWeight: "bold" },
  acceptBtnText: { color: "#0e1519", fontWeight: "bold" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
  passengerText: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  error: { color: "#ff7b86", fontSize: 12, marginTop: 10, lineHeight: 17 },
  cancelRideButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelRideText: { color: "#ff8b91", fontSize: 13, fontWeight: "800" },
});
