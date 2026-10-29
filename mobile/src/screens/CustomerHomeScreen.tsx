import { CarIcon, PersonCard, RouteCard, ui } from "../design";
import { ServicesHomeScreen } from "./ServicesHomeScreen";
import { RentalsHomeScreen } from "./RentalsHomeScreen";
import { MoversHomeScreen } from "./MoversHomeScreen";
import { TripChatPanel } from "../components/TripChatPanel";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  type ScrollViewInstance,
  type TextInputInstance,
  useWindowDimensions,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import {
  connectSocket,
  cancelTrip,
  createTrip,
  estimateFare,
  FareEstimate,
  geocodeAddress,
  getRoute,
  getNearbyDrivers,
  MapCoordinate,
  NearbyDriver,
  getTrip,
  getActiveTrip,
  Trip,
  VehicleCategory,
  LocationSuggestion,
  PaymentMethod,
  rateTrip,
  reverseGeocode,
  searchLocationSuggestions,
  AuthUser,
  CustomerProfile,
  getCustomerProfile,
  getTripHistory,
  updateCustomerProfile,
} from "../api";

const colors = {
  ink: "#eaf2f4",
  muted: "#92a1a9",
  navy: "#0e1519",
  panel: "#171e22",
  line: "#263238",
  blue: "#00d4ed",
};

const DEFAULT_PICKUP: MapCoordinate = { latitude: -1.6585, longitude: 29.2205 };
const DEFAULT_DESTINATION: MapCoordinate = {
  latitude: -1.6734,
  longitude: 29.238,
};

function MapSurface({
  pickup,
  destination,
  route,
  nearbyDrivers,
  assignedDriverLocation,
  onMapPress,
  fullScreen = false,
}: {
  pickup: MapCoordinate | null;
  destination: MapCoordinate | null;
  route: MapCoordinate[];
  nearbyDrivers: NearbyDriver[];
  assignedDriverLocation: MapCoordinate | null;
  onMapPress?: (coordinate: MapCoordinate) => void;
  fullScreen?: boolean;
}) {
  const mapRef = useRef<MapView>(null);
  const mapCenter = pickup || destination || DEFAULT_PICKUP;
  return (
    <View style={fullScreen ? styles.fullScreenMap : styles.mapContainer}>
      <MapView
        ref={mapRef}
        userInterfaceStyle="dark"
        style={fullScreen ? styles.fullScreenMap : styles.map}
        region={{
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        onPress={
          onMapPress
            ? (event) => onMapPress(event.nativeEvent.coordinate)
            : undefined
        }
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {pickup && (
          <Marker coordinate={pickup} pinColor={colors.blue} title="Pickup" />
        )}
        {destination && (
          <Marker
            coordinate={destination}
            pinColor="#25bd76"
            title="Destination"
          />
        )}
        {nearbyDrivers.map((driver) => {
          const [longitude, latitude] = driver.location.coordinates;
          return (
            <Marker
              key={driver.driverId}
              coordinate={{ latitude, longitude }}
              pinColor="#f5a524"
              title={driver.name || "2GO driver"}
              description={driver.category || "Available nearby"}
            />
          );
        })}
        {assignedDriverLocation && (
          <Marker
            coordinate={assignedDriverLocation}
            pinColor="#9b59ff"
            title="Your assigned driver"
          />
        )}
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={colors.blue}
            strokeWidth={4}
          />
        )}
      </MapView>
      <View style={styles.mapLabel}>
        <Text style={styles.mapLabelText}>© OpenStreetMap contributors</Text>
      </View>
      <TouchableOpacity style={styles.locationButton} accessibilityLabel="Center map on pickup" onPress={() => mapRef.current?.animateToRegion({ ...mapCenter, latitudeDelta: 0.035, longitudeDelta: 0.035 })}>
        <Text style={styles.locationIcon}>⌖</Text>
      </TouchableOpacity>
    </View>
  );
}

export function CustomerHomeScreen({
  user,
  onUserUpdated,
  onSignOut,
}: {
  user: AuthUser;
  onUserUpdated: (updates: Pick<AuthUser, "name" | "phone">) => void;
  onSignOut: () => void;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const userName = user.name;
  const [activeTab, setActiveTab] = useState<"Services" | "Rides" | "Rentals" | "Movers" | "Activity" | "Account">("Services");
  const tabScrollRef = useRef<ScrollViewInstance>(null);
  const [history, setHistory] = useState<Trip[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone);
  const [profileSaving, setProfileSaving] = useState(false);
  const [pickup, setPickup] = useState("Kyeshero, Goma");
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState<VehicleCategory>("STANDARD");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [tripState, setTripState] = useState<
    "IDLE" | "ASSIGNED" | "ON_TRIP" | "COMPLETED"
  >("IDLE");
  const [rating, setRating] = useState<number>(5);
  const [estimates, setEstimates] = useState<Partial<Record<VehicleCategory, FareEstimate>>>({});
  const estimate = estimates[category] ?? null;
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [isEditingLocations, setIsEditingLocations] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState("");
  const [currentLocation, setCurrentLocation] = useState<MapCoordinate | null>(
    null,
  );
  const [pickupLocation, setPickupLocation] = useState<MapCoordinate | null>(
    null,
  );
  const [destinationLocation, setDestinationLocation] =
    useState<MapCoordinate | null>(null);
  const [route, setRoute] = useState<MapCoordinate[]>([]);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [routedDistanceKm, setRoutedDistanceKm] = useState<number | null>(null);
  const [usingCurrentPickup, setUsingCurrentPickup] = useState(true);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [assignedDriverLocation, setAssignedDriverLocation] =
    useState<MapCoordinate | null>(null);
  const [locationMode, setLocationMode] = useState<"pickup" | "destination">(
    "destination",
  );
  const [activeLocationField, setActiveLocationField] = useState<
    "pickup" | "destination" | null
  >(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pickupInputRef = useRef<TextInputInstance>(null);
  const destinationInputRef = useRef<TextInputInstance>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      setHistory(await getTripHistory());
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "Unable to load ride history");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    tabScrollRef.current?.scrollTo({ y: 0, animated: false });
    if (activeTab === "Activity") loadHistory();
    if (activeTab === "Account" && !profile) {
      getCustomerProfile()
        .then((value) => {
          setProfile(value);
          setProfileName(value.userId.name);
          setProfilePhone(value.userId.phone);
        })
        .catch((profileError) => setError(profileError instanceof Error ? profileError.message : "Unable to load profile"));
    }
  }, [activeTab]);

  async function saveProfile() {
    setProfileSaving(true);
    setError("");
    try {
      const updated = await updateCustomerProfile({ name: profileName, phone: profilePhone });
      setProfile(updated);
      onUserUpdated({ name: updated.userId.name, phone: updated.userId.phone });
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Unable to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  function rideAgain(previousTrip: Trip) {
    const [pickupLongitude, pickupLatitude] = previousTrip.pickup.location.coordinates;
    const [destinationLongitude, destinationLatitude] = previousTrip.destination.location.coordinates;
    setPickup(previousTrip.pickup.address);
    setPickupLocation({ latitude: pickupLatitude, longitude: pickupLongitude });
    setDestination(previousTrip.destination.address);
    setDestinationLocation({ latitude: destinationLatitude, longitude: destinationLongitude });
    setCategory(previousTrip.category);
    setShowRideOptions(false);
    setIsEditingLocations(false);
    setUsingCurrentPickup(false);
    setActiveTab("Rides");
  }

  function applyTrip(tripValue: Trip) {
    setTrip(tripValue);
    if (tripValue.status === "TRIP_STARTED") setTripState("ON_TRIP");
    else if (
      tripValue.status === "TRIP_COMPLETED" ||
      tripValue.status === "PAID" ||
      tripValue.status === "RATED"
    )
      setTripState("COMPLETED");
    else if (tripValue.status !== "CANCELLED") setTripState("ASSIGNED");
  }

  function resetCancelledTrip() {
    setTripState("IDLE");
    setTrip(null);
    setAssignedDriverLocation(null);
    setShowRideOptions(false);
    setIsEditingLocations(false);
  }

  function confirmCancelTrip() {
    if (!trip?._id) return;
    Alert.alert(
      "Cancel this ride?",
      trip.driverId
        ? "Your driver may already be travelling to you."
        : "We will stop searching for a driver.",
      [
        { text: "Keep ride", style: "cancel" },
        {
          text: "Cancel ride",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelTrip(trip._id, "Cancelled by rider");
              resetCancelledTrip();
            } catch (cancelError) {
              setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel ride");
            }
          },
        },
      ],
    );
  }

  useEffect(() => {
    getActiveTrip()
      .then((activeTrip) => {
        if (activeTrip) applyTrip(activeTrip);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!pickupLocation) return;
    let active = true;
    const refresh = () =>
      getNearbyDrivers(pickupLocation, 10, category)
        .then((drivers) => {
          if (active) setNearbyDrivers(drivers);
        })
        .catch(() => {
          if (active) setNearbyDrivers([]);
        });
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pickupLocation, category]);

  useEffect(() => {
    let socket: Awaited<ReturnType<typeof connectSocket>>;
    connectSocket().then((connectedSocket) => {
      socket = connectedSocket;
      socket?.on(
        "driver:location_updated",
        (update: {
          driverId: string;
          coordinates: [number, number];
          heading: number;
        }) => {
          setNearbyDrivers((drivers) =>
            drivers.map((driver) =>
              String(driver.driverId) === String(update.driverId)
                ? {
                    ...driver,
                    heading: update.heading,
                    location: { coordinates: update.coordinates },
                  }
                : driver,
            ),
          );
        },
      );
    });
    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    let watcher: Location.LocationSubscription | undefined;
    async function watchCustomer() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted")
          throw new Error("Location permission is required");
        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000,
            distanceInterval: 25,
          },
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setCurrentLocation(location);
            if (usingCurrentPickup) {
              setPickupLocation(location);
              setPickup(
                `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
              );
            }
          },
        );
      } catch (locationError) {
        setError(
          locationError instanceof Error
            ? locationError.message
            : "Unable to read current location",
        );
      }
    }
    watchCustomer();
    return () => watcher?.remove();
  }, [usingCurrentPickup]);

  useEffect(() => {
    if (!pickupLocation || !destinationLocation) return;
    getRoute(pickupLocation, destinationLocation)
      .then((result) => {
        setRoute(result.coordinates);
        setEtaMinutes(result.durationMinutes);
        setRoutedDistanceKm(result.distanceKm);
      })
      .catch(() => {
        setRoute([]);
        setEtaMinutes(null);
        setRoutedDistanceKm(null);
      });
  }, [pickupLocation, destinationLocation]);

  useEffect(() => {
    if (!destination.trim()) return;
    const timer = setTimeout(() => {
      geocodeAddress(destination)
        .then(setDestinationLocation)
        .catch(() => setDestinationLocation(null));
    }, 700);
    return () => clearTimeout(timer);
  }, [destination]);

  useEffect(() => {
    const query = activeLocationField === "pickup" ? pickup : destination;
    if (!activeLocationField || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchLocationSuggestions(query)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 500);
    return () => clearTimeout(timer);
  }, [activeLocationField, pickup, destination]);

  const coordinates = {
    pickup: {
      address: pickup,
      coordinates: pickupLocation
        ? ([pickupLocation.longitude, pickupLocation.latitude] as [
            number,
            number,
          ])
        : ([DEFAULT_PICKUP.longitude, DEFAULT_PICKUP.latitude] as [
            number,
            number,
          ]),
    },
    destination: {
      address: destination,
      coordinates: destinationLocation
        ? ([destinationLocation.longitude, destinationLocation.latitude] as [
            number,
            number,
          ])
        : ([DEFAULT_DESTINATION.longitude, DEFAULT_DESTINATION.latitude] as [
            number,
            number,
          ]),
    },
  };

  useEffect(() => {
    let active = true;
    setEstimates({});
    if (!pickupLocation || !destinationLocation) {
      return;
    }
    for (const rideCategory of ["STANDARD", "COMFORT", "PREMIUM", "XL"] as const) {
      estimateFare({ ...coordinates, category: rideCategory, routedDistanceKm: routedDistanceKm || undefined })
        .then(value => { if (active) setEstimates(previous => ({ ...previous, [rideCategory]: value })); })
        .catch((requestError) => { if (active) setError(requestError.message); });
    }
    return () => { active = false; };
  }, [pickup, destination, pickupLocation, destinationLocation, routedDistanceKm]);

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
          .then(applyTrip)
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
      socket?.on("trip:searching", () => setTripState("ASSIGNED"));
      socket?.on("trip:assigned", () => setTripState("ASSIGNED"));
      socket?.on("trip:started", () => setTripState("ON_TRIP"));
      socket?.on("trip:completed", () => setTripState("COMPLETED"));
      socket?.on("trip:cancelled", (event: { cancelledBy?: string }) => {
        resetCancelledTrip();
        if (event.cancelledBy === "DRIVER") {
          Alert.alert("Ride cancelled", "The driver cancelled before pickup. You can request another ride.");
        }
      });
      socket?.on(
        "trip:location_updated",
        (update: { tripId: string; coordinates: [number, number] }) => {
          if (update.tripId === trip._id) {
            const [longitude, latitude] = update.coordinates;
            setAssignedDriverLocation({ latitude, longitude });
          }
        },
      );
    });
    return () => {
      socket?.disconnect();
    };
  }, [trip?._id]);

  async function requestTrip() {
    setError("");
    try {
      if (!pickupLocation || !destinationLocation) {
        setError("Wait for pickup and destination to appear on the map");
        return;
      }
      const created = await createTrip({
        ...coordinates,
        category,
        paymentMethod,
        routedDistanceKm: routedDistanceKm || undefined,
      });
      applyTrip(created);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request ride",
      );
    }
  }

  function selectSuggestion(suggestion: LocationSuggestion) {
    setShowRideOptions(false);
    if (activeLocationField === "pickup") {
      setPickup(suggestion.label);
      setPickupLocation(suggestion.coordinate);
      setUsingCurrentPickup(false);
    } else if (activeLocationField === "destination") {
      setDestination(suggestion.label);
      setDestinationLocation(suggestion.coordinate);
    }
    setSuggestions([]);
    setActiveLocationField(null);
    Keyboard.dismiss();
  }

  async function selectMapLocation(coordinate: MapCoordinate) {
    try {
      const address = await reverseGeocode(coordinate);
      setShowRideOptions(false);
      setActiveLocationField(null);
      Keyboard.dismiss();
      if (locationMode === "pickup") {
        setPickup(address);
        setPickupLocation(coordinate);
        setUsingCurrentPickup(false);
      } else {
        setDestination(address);
        setDestinationLocation(coordinate);
      }
    } catch (mapError) {
      setError(
        mapError instanceof Error
          ? mapError.message
          : "Unable to use map location",
      );
    }
  }

  async function finishTrip() {
    if (!trip?._id || isFinishing) return;
    setIsFinishing(true);
    setError("");
    try {
      await rateTrip(trip._id, rating);
      setTripState("IDLE");
      setTrip(null);
      setRating(5);
      setShowRideOptions(false);
      setIsEditingLocations(false);
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : "Unable to finish trip",
      );
    } finally {
      setIsFinishing(false);
    }
  }

  const rideSheetStyle = [
    styles.rideSheet,
    {
      maxHeight:
        keyboardHeight > 0
          ? Math.min(
              windowHeight * 0.58,
              Math.max(180, windowHeight - keyboardHeight - 150),
            )
          : windowHeight * 0.58,
      bottom: isEditingLocations
        ? keyboardHeight
          ? Platform.OS === "ios"
            ? keyboardHeight + 12
            : 12
          : 84
        : 84,
    },
  ];
  const locationEditorStyle = [
    styles.locationEditorSheet,
    {
      bottom: keyboardHeight
        ? Platform.OS === "ios"
          ? keyboardHeight + 12
          : 12
        : 84,
      maxHeight:
        keyboardHeight > 0
          ? Math.min(
              windowHeight * 0.52,
              Math.max(200, windowHeight - keyboardHeight - 130),
            )
          : windowHeight * 0.52,
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={tabScrollRef}
        contentContainerStyle={
          activeTab === "Rides" || activeTab === "Rentals" || activeTab === "Movers" ? styles.rideContent : styles.content
        }
        scrollEnabled={activeTab !== "Rides" && activeTab !== "Rentals" && activeTab !== "Movers"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "Services" && (
          <ServicesHomeScreen
            user={user}
            currentLocation={currentLocation}
            activeTrip={trip}
            onSelectRide={() => setActiveTab("Rides")}
            onSelectRentals={() => setActiveTab("Rentals")}
            onSelectMovers={() => setActiveTab("Movers")}
            onSelectActivity={() => setActiveTab("Activity")}
            onSelectAccount={() => setActiveTab("Account")}
          />
        )}
        {activeTab === "Rentals" && <RentalsHomeScreen />}
        {activeTab === "Movers" && <MoversHomeScreen user={user} />}
        {activeTab === "Rides" && <View style={styles.rideScreen}>
        <MapSurface
          pickup={pickupLocation || currentLocation}
          destination={destinationLocation}
          route={route}
          nearbyDrivers={nearbyDrivers}
          assignedDriverLocation={assignedDriverLocation}
          onMapPress={tripState === "IDLE" ? selectMapLocation : undefined}
          fullScreen
        />

        {tripState === "IDLE" && !isEditingLocations && !showRideOptions && (
          <TouchableOpacity
            style={styles.rideSearchPrompt}
            accessibilityRole="button"
            accessibilityLabel="Enter pickup and destination"
            onPress={() => setIsEditingLocations(true)}
          >
            <Text style={styles.promptEyebrow}>PICKUP</Text>
            <Text style={styles.promptPickup} numberOfLines={1}>
              {pickupLocation ? pickup : "Use your current location"}
            </Text>
            <View style={styles.promptDivider} />
            <Text style={styles.promptDestinationLabel}>WHERE TO?</Text>
            <Text style={styles.promptDestination} numberOfLines={1}>
              {destinationLocation ? destination : "Enter your destination"}
            </Text>
            <View style={styles.promptArrow}>
              <Text style={styles.promptArrowText}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {tripState === "IDLE" && isEditingLocations && (
          <ScrollView
            style={locationEditorStyle}
            contentContainerStyle={styles.locationEditorContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.editorHeader}>
              <View style={styles.editorTitleGroup}>
                <View style={styles.editorBackIcon}>
                  <Text style={styles.editorBackText}>⌖</Text>
                </View>
                <View>
                  <Text style={styles.editorTitle}>Plan your ride</Text>
                  <Text style={styles.editorSubtitle}>Choose where to be picked up and dropped off</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editorCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Close location search"
                onPress={() => {
                  Keyboard.dismiss();
                  setActiveLocationField(null);
                  setIsEditingLocations(false);
                }}
              >
                <Text style={styles.editorCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editorFields}>
              <View style={styles.editorRail}>
                <View style={styles.editorPickupDot} />
                <View style={styles.editorRailLine} />
                <View style={styles.editorDestinationDot} />
              </View>
              <View style={styles.editorInputs}>
                <View style={styles.editorPickupField}>
                  <Text style={styles.editorFieldLabel}>PICKUP</Text>
                  <TextInput
                    style={styles.editorInput}
                    accessibilityLabel="Pickup location"
                    ref={pickupInputRef}
                    value={pickup}
                    selectTextOnFocus
                    onFocus={() => {
                      setLocationMode("pickup");
                      setActiveLocationField("pickup");
                    }}
                    returnKeyType="next"
                    autoCorrect={false}
                    onSubmitEditing={() => destinationInputRef.current?.focus()}
                    onChangeText={(value) => {
                      setShowRideOptions(false);
                      setUsingCurrentPickup(false);
                      setPickup(value);
                      setPickupLocation(null);
                    }}
                    placeholder="Enter pickup location"
                    placeholderTextColor="#7f8b91"
                  />
                </View>
                <View style={styles.editorDivider} />
                <View style={styles.editorDestinationField}>
                  <Text style={styles.editorDestinationLabel}>DESTINATION</Text>
                  <TextInput
                    style={[styles.editorInput, styles.editorDestinationInput]}
                    accessibilityLabel="Destination"
                    ref={destinationInputRef}
                    value={destination}
                    selectTextOnFocus
                    onFocus={() => {
                      setLocationMode("destination");
                      setActiveLocationField("destination");
                    }}
                    returnKeyType="search"
                    autoCorrect={false}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    onChangeText={(value) => {
                      setShowRideOptions(false);
                      setDestination(value);
                      setDestinationLocation(null);
                    }}
                    placeholder="Where would you like to go?"
                    placeholderTextColor="#62747b"
                  />
                </View>
              </View>
            </View>

            {suggestions.length > 0 && (
              <View style={styles.editorSuggestions}>
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.editorSuggestion}
                    onPress={() => selectSuggestion(suggestion)}
                  >
                    <View style={styles.suggestionIcon}>
                      <Text style={styles.suggestionIconText}>⌖</Text>
                    </View>
                    <Text style={styles.editorSuggestionText} numberOfLines={2}>
                      {suggestion.label}
                    </Text>
                    <Text style={styles.suggestionChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.mapPickRow}>
              <Text style={styles.mapPickHint}>Choose on map:</Text>
              {(["pickup", "destination"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setLocationMode(mode);
                    Keyboard.dismiss();
                    setActiveLocationField(null);
                  }}
                  style={styles.mapPickButton}
                >
                  <Text style={styles.mapPickButtonText}>
                    {mode === "pickup" ? "Pickup" : "Drop-off"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!pickupLocation || !destinationLocation) && styles.buttonDisabled,
              ]}
              disabled={!pickupLocation || !destinationLocation}
              onPress={() => {
                Keyboard.dismiss();
                setActiveLocationField(null);
                setIsEditingLocations(false);
                setShowRideOptions(true);
              }}
            >
              <Text style={styles.primaryButtonText}>See available rides</Text>
            </TouchableOpacity>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>
        )}

        {tripState === "IDLE" && showRideOptions && (
          <ScrollView
            style={rideSheetStyle}
            contentContainerStyle={styles.sheet}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeading}>
              <View>
                <Text style={styles.sheetTitle}>Choose your ride</Text>
                <Text style={styles.sheetSubtitle}>
                  {`${routedDistanceKm ? `${routedDistanceKm.toFixed(1)} km` : "Route"}${etaMinutes ? ` · ${etaMinutes} min` : ""}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowRideOptions(false);
                  setIsEditingLocations(true);
                }}
              >
                <Text style={styles.editRoute}>Edit route</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rideOptions}>
              <View style={styles.optionsHeading}>
                <Text style={styles.optionsTitle}>Available rides</Text>
                <Text style={styles.nearbyLabel}>{nearbyDrivers.length} nearby</Text>
              </View>
              {(["STANDARD", "COMFORT", "PREMIUM", "XL"] as const).map((cat) => (
                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ checked: category === cat }}
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.rideOption,
                    category === cat && styles.rideOptionActive,
                  ]}
                >
                  <View style={[styles.carGlyph, category === cat && styles.carGlyphActive]}>
                    <CarIcon active={category === cat} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rideName}>
                      2Go {cat[0] + cat.slice(1).toLowerCase()}
                    </Text>
                    <Text style={styles.rideMeta}>
                      {etaMinutes ? `${etaMinutes} min` : "Route pending"} away
                    </Text>
                  </View>
                  <Text style={styles.ridePrice}>
                    {estimates[cat]
                      ? `${estimates[cat]!.currency} ${Math.round(estimates[cat]!.estimatedFare).toLocaleString()}`
                      : "Calculating"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentIcon}>R</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentText}>Cash</Text>
                <Text style={styles.paymentHint}>Pay your driver after the ride</Text>
              </View>
              <Text style={styles.paymentSelected}>SELECTED</Text>
            </View>
            {estimate?.pricingNotice && (
              <View style={styles.pricingNotice}>
                <Text style={styles.pricingNoticeTitle}>
                  {estimate.fareType === "INTERCITY" ? "INTERCITY ESTIMATE" : "RWANDA METERED FARE"}
                </Text>
                <Text style={styles.pricingNoticeText}>{estimate.pricingNotice}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.primaryButton, !estimate && styles.buttonDisabled]}
              onPress={requestTrip}
              disabled={!estimate}
            >
              <Text style={styles.primaryButtonText}>
                Confirm 2Go {category[0] + category.slice(1).toLowerCase()} ·{" "}
                {estimate
                  ? `${estimate.currency} ${Math.round(estimate.estimatedFare).toLocaleString()}`
                  : "Calculating..."}
              </Text>
            </TouchableOpacity>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>
        )}

        {tripState === "ASSIGNED" && (
          <ScrollView style={rideSheetStyle} contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
            <View style={ui.handle}/>
            <View style={styles.statusLine}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>DRIVER ON THE WAY</Text>
              <Text style={styles.eta}>
                {etaMinutes ? `${etaMinutes} min` : "--"}
              </Text>
            </View>
            <Text style={styles.sheetTitle}>
              {trip?.status === "SEARCHING_DRIVER"
                ? "Finding your driver"
                : "Your driver is heading to you"}
            </Text>
            <PersonCard name={trip?.driverId?.userId?.name || "Matching your driver"} detail={trip?.driverId?.activeVehicleId ? `${trip.driverId.activeVehicleId.make || ""} ${trip.driverId.activeVehicleId.model || ""}` : "Driver details appear after assignment"} badge={trip?.driverId?.rating ? `★ ${trip.driverId.rating.toFixed(1)}` : undefined}/>
            {trip?.driverId?.activeVehicleId?.plateNumber && <Text style={styles.plate}>{trip.driverId.activeVehicleId.plateNumber}</Text>}
            <RouteCard pickup={pickup} destination={destination}/>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                getTrip(trip?._id || "")
                  .then(applyTrip)
                  .catch(() => undefined)
              }
            >
              <Text style={styles.primaryButtonText}>Refresh trip status</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelRideButton} onPress={confirmCancelTrip}>
              <Text style={styles.cancelRideText}>Cancel ride</Text>
            </TouchableOpacity>
            {trip?._id && ["DRIVER_ACCEPTED", "DRIVER_ARRIVED"].includes(trip.status) && (
              <TripChatPanel tripId={trip._id} userId={user.id} title="Chat with your driver" />
            )}
          </ScrollView>
        )}

        {tripState === "ON_TRIP" && (
          <ScrollView style={rideSheetStyle} contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
            <View style={[styles.statusLine, { backgroundColor: "#174039" }]}>
              <View style={styles.liveDot} />
              <Text style={styles.statusText}>TRIP IN PROGRESS</Text>
            </View>
            <Text style={styles.sheetTitle}>Heading to {destination}</Text>
            <Text style={styles.subText}>Live trip tracking is active</Text>
            <PersonCard name={trip?.driverId?.userId?.name || "Matching your driver"} detail={trip?.driverId?.activeVehicleId ? `${trip.driverId.activeVehicleId.make || ""} ${trip.driverId.activeVehicleId.model || ""}` : "Driver details appear after assignment"} badge={trip?.driverId?.rating ? `★ ${trip.driverId.rating.toFixed(1)}` : undefined}/>
            {trip?.driverId?.activeVehicleId?.plateNumber && <Text style={styles.plate}>{trip.driverId.activeVehicleId.plateNumber}</Text>}
            <RouteCard pickup={pickup} destination={destination}/>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                getTrip(trip?._id || "")
                  .then(applyTrip)
                  .catch(() => undefined)
              }
            >
              <Text style={styles.primaryButtonText}>Refresh trip status</Text>
            </TouchableOpacity>
            {trip?._id && (
              <TripChatPanel tripId={trip._id} userId={user.id} title="Chat with your driver" />
            )}
          </ScrollView>
        )}

        {tripState === "COMPLETED" && (
          <ScrollView style={rideSheetStyle} contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
            <View style={ui.success}><Text style={ui.check}>✓</Text><Text style={ui.label}>TRIP COMPLETED</Text><Text style={ui.successTitle}>You have arrived!</Text><Text style={ui.muted}>Thank you for riding with 2Go.</Text></View><RouteCard pickup={pickup} destination={destination}/><PersonCard name={trip?.driverId?.userId?.name || "Your driver"} detail="Rate your trip"/>
            <Text style={styles.fare}>
              RWF{" "}
              {Math.round(
                trip?.finalFare ?? trip?.estimatedFare ?? 0,
              ).toLocaleString()}
            </Text>
            <Text style={styles.subText}>Rate your driver</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity accessibilityLabel={`Rate ${star} out of 5 stars`} accessibilityRole="radio" accessibilityState={{checked: star === rating}} key={star} onPress={() => setRating(star)}>
                  <Text style={styles.star}>{star <= rating ? "★" : "☆"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={ui.receipt}>
              <Text style={ui.heading}>Fare summary</Text>
              <View style={ui.receiptRow}><Text style={ui.muted}>Distance</Text><Text style={ui.body}>{trip?.distanceKm.toFixed(1)} km</Text></View>
              <View style={ui.receiptRow}><Text style={ui.muted}>Estimated duration</Text><Text style={ui.body}>{trip?.estimatedDurationMinutes} min</Text></View>
              <View style={ui.receiptRow}><Text style={ui.heading}>Trip total</Text><Text style={ui.total}>RWF {Math.round(trip?.finalFare ?? trip?.estimatedFare ?? 0).toLocaleString()}</Text></View>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={finishTrip}
              disabled={isFinishing}
            >
              <Text style={styles.primaryButtonText}>
                {isFinishing ? "Saving..." : "Done & submit review"}
              </Text>
            </TouchableOpacity>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>
        )}
        </View>}

        {activeTab === "Activity" && (
          <View style={styles.tabPage}>
            <Text style={styles.tabEyebrow}>YOUR RIDES</Text>
            <Text style={styles.tabTitle}>Activity</Text>
            <Text style={styles.tabSubtitle}>Recent requests, completed journeys and cancellations.</Text>
            {historyLoading && <Text style={styles.emptyText}>Loading your rides...</Text>}
            {!historyLoading && history.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>↗</Text>
                <Text style={styles.emptyTitle}>No rides yet</Text>
                <Text style={styles.emptyText}>Your completed and cancelled rides will appear here.</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveTab("Rides")}>
                  <Text style={styles.primaryButtonText}>Request your first ride</Text>
                </TouchableOpacity>
              </View>
            )}
            {history.map((historyTrip) => (
              <View key={historyTrip._id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View>
                    <Text style={styles.historyDate}>{new Date(historyTrip.timestamps?.requestedAt || historyTrip.createdAt || Date.now()).toLocaleDateString()}</Text>
                    <Text style={styles.historyCategory}>2Go {historyTrip.category.toLowerCase()}</Text>
                  </View>
                  <View style={[styles.statusPill, historyTrip.status === "CANCELLED" && styles.statusPillCancelled]}>
                    <Text style={[styles.statusPillText, historyTrip.status === "CANCELLED" && styles.statusPillTextCancelled]}>{historyTrip.status.replaceAll("_", " ")}</Text>
                  </View>
                </View>
                <RouteCard pickup={historyTrip.pickup.address} destination={historyTrip.destination.address} />
                <View style={styles.historyFooter}>
                  <Text style={styles.historyDriver}>{historyTrip.driverId?.userId?.name || "No driver assigned"}</Text>
                  <Text style={styles.historyFare}>RWF {Math.round(historyTrip.finalFare ?? historyTrip.estimatedFare).toLocaleString()}</Text>
                </View>
                {historyTrip.cancellationReason && <Text style={styles.cancellationReason}>{historyTrip.cancellationReason}</Text>}
                <TouchableOpacity style={styles.rideAgainButton} onPress={() => rideAgain(historyTrip)}>
                  <Text style={styles.rideAgainText}>Ride this route again</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === "Account" && (
          <View style={styles.tabPage}>
            <Text style={styles.tabEyebrow}>YOUR ACCOUNT</Text>
            <Text style={styles.tabTitle}>Account</Text>
            <View style={styles.profileHero}>
              <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{profileName.slice(0, 1).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.profileHeroName}>{profileName}</Text><Text style={styles.profileEmail}>{user.email}</Text></View>
            </View>
            <View style={styles.profileCard}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput value={profileName} onChangeText={setProfileName} style={styles.profileInput} placeholderTextColor={colors.muted} />
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <TextInput value={profilePhone} onChangeText={setProfilePhone} style={styles.profileInput} keyboardType="phone-pad" placeholderTextColor={colors.muted} />
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={[styles.profileInput, styles.readOnlyInput]}><Text style={styles.readOnlyText}>{user.email}</Text></View>
              <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={profileSaving}>
                <Text style={styles.primaryButtonText}>{profileSaving ? "Saving..." : "Save profile"}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.profileCard}>
              <Text style={styles.profileSectionTitle}>Saved places</Text>
              {profile?.savedPlaces?.length ? profile.savedPlaces.map((place, index) => (
                <View key={place._id || `${place.name}-${index}`} style={styles.savedPlaceRow}>
                  <Text style={styles.savedPlaceIcon}>⌂</Text>
                  <View style={{ flex: 1 }}><Text style={styles.savedPlaceName}>{place.name}</Text><Text style={styles.savedPlaceAddress}>{place.address}</Text></View>
                </View>
              )) : <Text style={styles.emptyText}>No saved places yet.</Text>}
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {!keyboardHeight && <View style={styles.bottomNav}>
        {(["Services", "Rides", "Rentals", "Movers", "Activity", "Account"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
            onPress={() => setActiveTab(tab)}
            style={styles.navItem}
          >
            <Text style={[styles.navIcon, activeTab === tab && styles.navActive]}>
              {tab === "Services" ? "▦" : tab === "Rides" ? "▰" : tab === "Rentals" ? "⌑" : tab === "Movers" ? "⇧" : tab === "Activity" ? "▤" : "♙"}
            </Text>
            <Text style={[styles.navLabel, activeTab === tab && styles.navActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {color: colors.ink, backgroundColor: "#303a40", padding: 10, borderRadius: 8, alignSelf: "flex-end", fontWeight: "700"},
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingBottom: 92 },
  rideContent: { flex: 1 },
  rideScreen: { flex: 1, minHeight: 0, position: "relative" },
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
  mapContainer: { height: 390, position: "relative" },
  map: {
    height: 390,
    backgroundColor: "#1d282d",
    overflow: "hidden",
    position: "relative",
  },
  fullScreenMap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#1d282d",
  },
  rideSearchPrompt: {
    position: "absolute",
    bottom: 86,
    left: 16,
    right: 16,
    zIndex: 4,
    backgroundColor: "#f4f7f7",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#ffffff",
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  locationEditorSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e5ebed",
    overflow: "hidden",
    zIndex: 5,
    elevation: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  locationEditorContent: {
    padding: 16,
    paddingBottom: 18,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  editorTitleGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  editorBackIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e9f7f8",
  },
  editorBackText: { color: "#087f8c", fontSize: 22, fontWeight: "700" },
  editorTitle: { color: "#152126", fontSize: 17, fontWeight: "800" },
  editorSubtitle: { color: "#66757b", fontSize: 11, marginTop: 2 },
  editorCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef1f2",
    marginLeft: 8,
  },
  editorCloseText: { color: "#33434a", fontSize: 25, lineHeight: 28 },
  editorFields: {
    flexDirection: "row",
    backgroundColor: "#f4f6f6",
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e3e8e9",
  },
  editorRail: {
    width: 22,
    alignItems: "center",
    paddingTop: 20,
  },
  editorPickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#18252a",
  },
  editorRailLine: {
    height: 53,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "#8b999e",
  },
  editorDestinationDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#0aa6b5",
  },
  editorInputs: { flex: 1, gap: 7 },
  editorPickupField: {
    minHeight: 65,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e6ebec",
  },
  editorDestinationField: {
    minHeight: 74,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#078b9a",
  },
  editorFieldLabel: {
    color: "#64747a",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  editorDestinationLabel: {
    color: "#087f8c",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  editorInput: {
    minHeight: 39,
    color: "#1d2b31",
    fontSize: 15,
    padding: 0,
    textAlignVertical: "center",
  },
  editorDestinationInput: {
    color: "#14262c",
    fontSize: 16,
    fontWeight: "700",
  },
  editorDivider: { height: 1 },
  editorSuggestions: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#f6f8f8",
    borderWidth: 1,
    borderColor: "#e5ebed",
    overflow: "hidden",
  },
  editorSuggestion: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e9ea",
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8eeee",
  },
  suggestionIconText: { color: "#59696f", fontSize: 16 },
  editorSuggestionText: { flex: 1, color: "#233238", fontSize: 12, lineHeight: 17 },
  suggestionChevron: { color: "#6b7b81", fontSize: 22 },
  mapPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
    marginTop: 11,
  },
  mapPickHint: { color: "#66757b", fontSize: 11, marginRight: 2 },
  mapPickButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: "#edf5f5",
  },
  mapPickButtonText: { color: "#176773", fontSize: 11, fontWeight: "800" },
  promptEyebrow: {
    color: "#637278",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  promptPickup: {
    color: "#233139",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
    paddingRight: 30,
  },
  promptDivider: {
    height: 1,
    backgroundColor: "#dce3e4",
    marginVertical: 10,
  },
  promptDestinationLabel: {
    color: "#07869a",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  promptDestination: {
    color: "#14262c",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 3,
    paddingRight: 30,
  },
  promptArrow: {
    position: "absolute",
    right: 16,
    top: "42%",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#d9f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  promptArrowText: { color: "#07869a", fontSize: 27, lineHeight: 30 },
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
    top: 16,
    left: 12,
    backgroundColor: "#1c252a",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  mapLabelText: {
    color: "#b7cbd0",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  locationButton: {
    position: "absolute",
    right: 18,
    top: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#202b31",
    alignItems: "center",
    justifyContent: "center",
  },
  locationIcon: { color: colors.blue, fontSize: 25, lineHeight: 26 },
  rideSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 84,
    maxHeight: "76%",
    backgroundColor: colors.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    zIndex: 3,
  },
  sheet: {
    padding: 18,
    paddingBottom: 20,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3a484e",
    alignSelf: "center",
    marginBottom: 5,
  },
  sheetToggle: {
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 8,
  },
  sheetToggleLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  sheetHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetSubtitle: { color: colors.muted, fontSize: 12, marginTop: 1 },
  editRoute: { color: colors.blue, fontSize: 12, fontWeight: "800", padding: 8 },
  nearbyLabel: { color: "#9ee9db", fontSize: 10, fontWeight: "800" },
  optionsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  optionsTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  pricingNotice: {
    backgroundColor: "#12282a",
    borderColor: "#25565a",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  pricingNoticeTitle: { color: "#39e6b0", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  pricingNoticeText: { color: "#b6c9cb", fontSize: 11, lineHeight: 16, marginTop: 4 },
  cancelRideButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 10 },
  cancelRideText: { color: "#ff8b91", fontSize: 13, fontWeight: "800" },
  sheetTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 0,
  },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#202a2f",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3d4a50",
  },
  searchRail: { alignItems: "center", width: 18, paddingTop: 15 },
  greenDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.blue,
  },
  destinationDot: {
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: "#34d399",
  },
  railLine: {
    height: 54,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.muted,
  },
  searchFields: { flex: 1 },
  locationField: {
    minHeight: 70,
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "#182126",
    borderRadius: 11,
  },
  destinationField: {
    minHeight: 78,
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "#112b30",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#168a99",
  },
  locationFieldLabel: {
    color: "#a9b9be",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  destinationFieldLabel: {
    color: "#54d9e7",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },
  locationInput: {
    color: colors.ink,
    fontSize: 16,
    minHeight: 42,
    paddingVertical: 6,
    paddingHorizontal: 0,
    textAlignVertical: "center",
  },
  destinationInput: { color: "#ffffff", fontWeight: "700" },
  fieldDivider: { height: 10 },
  suggestions: {
    backgroundColor: "#0e1519",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    marginTop: 6,
    overflow: "hidden",
  },
  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  suggestionText: { color: "#cbd7e7", fontSize: 12, lineHeight: 17 },
  mapModeRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#171e22", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 12 },
  mapMode: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapModeActive: { borderColor: colors.blue, backgroundColor: "#173b43" },
  mapModeText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 0,
    marginBottom: 0,
    textTransform: "uppercase",
  },
  rideOptions: { gap: 9, marginTop: 16 },
  rideOption: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1b2328",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 11,
    gap: 10,
  },
  rideOptionActive: { borderLeftWidth: 5, borderLeftColor: colors.blue, backgroundColor: "#20282d" },
  carGlyph: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#2b353a",
    alignItems: "center",
    justifyContent: "center",
  },
  carGlyphActive: { backgroundColor: "#173b43" },
  carGlyphText: { color: colors.ink, fontSize: 10, fontWeight: "900" },
  rideName: { color: colors.ink, fontSize: 16, fontWeight: "600" },
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
    backgroundColor: "#39e6b0",
    color: "#071015",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "900",
  },
  paymentText: { color: colors.ink, fontWeight: "700", marginLeft: 10 },
  paymentHint: { color: colors.muted, fontSize: 10, marginLeft: 10, marginTop: 3 },
  paymentSelected: { color: "#9ee9db", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  disabledFeature: { opacity: 0.48 },
  disabledFeatureText: { color: colors.muted, fontSize: 10, marginLeft: 10, marginTop: 3 },
  comingSoon: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  chevron: { color: colors.muted, fontSize: 25, marginLeft: "auto" },
  paymentOptions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  paymentOptionActive: { borderColor: "#39e6b0", backgroundColor: "#123b35" },
  paymentOptionText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  primaryButton: {
    backgroundColor: colors.blue,
    minHeight: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 12,
  },
  buttonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: "#071015", fontSize: 14, fontWeight: "900" },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#123b35",
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
    color: "#67ebc7",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  eta: { color: colors.ink, fontWeight: "900", marginLeft: "auto" },
  subText: { color: colors.muted, fontSize: 13, marginBottom: 12 },
  tripRoute: {
    backgroundColor: "#1c2429",
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
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginVertical: 18 },
  star: { color: "#ffc857", fontSize: 38 },
  tabPage: { padding: 20, paddingTop: 28, minHeight: 680 },
  tabEyebrow: { color: colors.blue, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  tabTitle: { color: colors.ink, fontSize: 30, fontWeight: "900", marginTop: 5 },
  tabSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 20 },
  emptyCard: { backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 24, alignItems: "center", gap: 8 },
  emptyIcon: { color: colors.blue, fontSize: 34 },
  emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginVertical: 12 },
  historyCard: { backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  historyDate: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  historyCategory: { color: colors.muted, fontSize: 11, marginTop: 3, textTransform: "capitalize" },
  statusPill: { backgroundColor: "#123b35", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  statusPillCancelled: { backgroundColor: "#40252a" },
  statusPillText: { color: "#39e6b0", fontSize: 9, fontWeight: "900" },
  statusPillTextCancelled: { color: "#ff8b91" },
  historyFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  historyDriver: { color: colors.muted, fontSize: 12, flex: 1 },
  historyFare: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  cancellationReason: { color: "#ff9da3", fontSize: 11, marginTop: 10 },
  rideAgainButton: { minHeight: 42, borderColor: "#25565a", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 14 },
  rideAgainText: { color: colors.blue, fontSize: 12, fontWeight: "800" },
  profileHero: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.panel, borderRadius: 18, padding: 18, marginVertical: 18, borderColor: colors.line, borderWidth: 1 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#19424a", alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: colors.blue, fontSize: 25, fontWeight: "900" },
  profileHeroName: { color: colors.ink, fontSize: 19, fontWeight: "900" },
  profileEmail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  profileCard: { backgroundColor: colors.panel, borderRadius: 18, padding: 18, marginBottom: 14, borderColor: colors.line, borderWidth: 1 },
  profileSectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", marginBottom: 10 },
  inputLabel: { color: colors.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 10, marginBottom: 6 },
  profileInput: { minHeight: 50, backgroundColor: "#10171b", borderColor: colors.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, color: colors.ink, fontSize: 14, justifyContent: "center" },
  readOnlyInput: { opacity: 0.7 },
  readOnlyText: { color: colors.muted, fontSize: 14 },
  savedPlaceRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomColor: colors.line, borderBottomWidth: 1 },
  savedPlaceIcon: { color: colors.blue, fontSize: 23 },
  savedPlaceName: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  savedPlaceAddress: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  signOutButton: { minHeight: 52, borderColor: "#65383e", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  signOutText: { color: "#ff8b91", fontSize: 14, fontWeight: "900" },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: "#0e1519",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: { alignItems: "center", gap: 3, flex: 1, minWidth: 0 },
  navIcon: { color: colors.muted, fontSize: 21 },
  navLabel: { color: colors.muted, fontSize: 9, fontWeight: "700" },
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
