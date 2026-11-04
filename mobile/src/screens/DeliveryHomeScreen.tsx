import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  cancelDelivery,
  createDelivery,
  DeliveryEstimate,
  DeliveryOrder,
  DeliveryPackageType,
  estimateDelivery,
  geocodeAddress,
  getMyDeliveries,
  rateDelivery,
} from "../api";

const colors = {
  background: "#0e1519",
  panel: "#171e22",
  line: "#263238",
  text: "#eaf2f4",
  muted: "#92a1a9",
  accent: "#00d4ed",
  mint: "#36e7bb",
};

const packageOptions: { key: DeliveryPackageType; label: string }[] = [
  { key: "DOCUMENT", label: "Document" },
  { key: "SMALL", label: "Small" },
  { key: "MEDIUM", label: "Medium" },
  { key: "LARGE", label: "Large" },
];

const statusLabel: Record<DeliveryOrder["status"], string> = {
  REQUESTED: "Awaiting driver",
  ASSIGNED: "Driver assigned",
  PICKED_UP: "Parcel picked up",
  IN_TRANSIT: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#65747b"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export function DeliveryHomeScreen() {
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [weightKg, setWeightKg] = useState("1");
  const [notes, setNotes] = useState("");
  const [packageType, setPackageType] = useState<DeliveryPackageType>("SMALL");
  const [fragile, setFragile] = useState(false);
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [ratingDrafts, setRatingDrafts] = useState<Record<string, number>>({});

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await getMyDeliveries());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load your deliveries.");
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const timer = setInterval(() => void loadOrders(), 15000);
    return () => clearInterval(timer);
  }, [loadOrders]);

  async function getEstimate() {
    setError("");
    setBusy("estimate");
    setEstimate(null);
    try {
      const [pickup, destination] = await Promise.all([
        geocodeAddress(pickupAddress),
        geocodeAddress(destinationAddress),
      ]);
      const result = await estimateDelivery({
        pickupCoordinates: [pickup.longitude, pickup.latitude],
        destinationCoordinates: [destination.longitude, destination.latitude],
        weightKg: Number(weightKg),
      });
      setEstimate(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to estimate delivery.");
    } finally {
      setBusy("");
    }
  }

  async function submitDelivery() {
    setError("");
    setBusy("submit");
    try {
      const [pickup, destination] = await Promise.all([
        geocodeAddress(pickupAddress),
        geocodeAddress(destinationAddress),
      ]);
      const order = await createDelivery({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        pickupAddress: pickupAddress.trim(),
        pickupCoordinates: [pickup.longitude, pickup.latitude],
        destinationAddress: destinationAddress.trim(),
        destinationCoordinates: [destination.longitude, destination.latitude],
        packageType,
        packageDescription: packageDescription.trim(),
        weightKg: Number(weightKg),
        fragile,
        notes: notes.trim(),
      });
      setOrders((current) => [order, ...current]);
      setEstimate(null);
      setPickupAddress("");
      setDestinationAddress("");
      setRecipientName("");
      setRecipientPhone("");
      setPackageDescription("");
      setWeightKg("1");
      setNotes("");
      setFragile(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request delivery.");
    } finally {
      setBusy("");
    }
  }

  async function cancelOrder(orderId: string) {
    setBusy(orderId);
    setError("");
    try {
      const updated = await cancelDelivery(orderId);
      setOrders((current) => current.map((order) => order._id === orderId ? updated : order));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to cancel delivery.");
    } finally {
      setBusy("");
    }
  }

  async function submitRating(order: DeliveryOrder) {
    setBusy(order._id);
    setError("");
    try {
      const updated = await rateDelivery(order._id, ratingDrafts[order._id] || 5, "");
      setOrders((current) => current.map((item) => item._id === order._id ? updated : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save rating.");
    } finally {
      setBusy("");
    }
  }

  const readyToEstimate =
    pickupAddress.trim().length > 2 &&
    destinationAddress.trim().length > 2 &&
    Number(weightKg) >= 0.1 &&
    Number(weightKg) <= 100;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>2GO COURIER</Text>
        <Text style={styles.title}>Send a parcel</Text>
        <Text style={styles.subtitle}>Book a pickup and follow delivery progress from your phone.</Text>
      </View>

      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Route</Text>
        <Field label="Pickup address" value={pickupAddress} onChangeText={(value) => { setPickupAddress(value); setEstimate(null); }} placeholder="Street, building, neighbourhood" />
        <Field label="Destination address" value={destinationAddress} onChangeText={(value) => { setDestinationAddress(value); setEstimate(null); }} placeholder="Where should we deliver it?" />
        <Text style={styles.helper}>Enter recognizable addresses. The fare estimate uses map coordinates and the current Operations tariff.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Parcel details</Text>
        <Text style={styles.label}>Package size</Text>
        <View style={styles.optionRow}>
          {packageOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected: packageType === option.key }}
              onPress={() => setPackageType(option.key)}
              style={[styles.option, packageType === option.key && styles.optionSelected]}
            >
              <Text style={[styles.optionText, packageType === option.key && styles.optionTextSelected]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field label="What are you sending?" value={packageDescription} onChangeText={setPackageDescription} placeholder="Describe the parcel" />
        <Field label="Approximate weight (kg)" value={weightKg} onChangeText={(value) => { setWeightKg(value); setEstimate(null); }} placeholder="1" keyboardType="decimal-pad" />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.label}>Fragile parcel</Text>
            <Text style={styles.helper}>Let the courier know to handle it carefully.</Text>
          </View>
          <Switch value={fragile} onValueChange={setFragile} trackColor={{ false: "#364249", true: "#087f8c" }} thumbColor={fragile ? colors.accent : "#c5d0d4"} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recipient</Text>
        <Field label="Recipient name" value={recipientName} onChangeText={setRecipientName} placeholder="Who will receive the parcel?" />
        <Field label="Recipient phone" value={recipientPhone} onChangeText={setRecipientPhone} placeholder="+250..." keyboardType="phone-pad" />
        <Field label="Delivery notes (optional)" value={notes} onChangeText={setNotes} placeholder="Gate code, landmarks, or instructions" multiline />
      </View>

      {estimate && (
        <View style={styles.estimate}>
          <View>
            <Text style={styles.estimateLabel}>ESTIMATED FARE</Text>
            <Text style={styles.estimateFare}>{estimate.currency} {estimate.fare.toLocaleString()}</Text>
            <Text style={styles.helper}>Approx. {estimate.distanceKm.toFixed(1)} km · cash or mobile money, confirmed by Operations</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          disabled={!readyToEstimate || !!busy}
          style={[styles.secondaryButton, (!readyToEstimate || !!busy) && styles.disabled]}
          onPress={() => void getEstimate()}
        >
          {busy === "estimate" ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.secondaryText}>Get fare estimate</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!estimate || !recipientName.trim() || !recipientPhone.trim() || !packageDescription.trim() || !!busy}
          style={[styles.primaryButton, (!estimate || !recipientName.trim() || !recipientPhone.trim() || !packageDescription.trim() || !!busy) && styles.disabled]}
          onPress={() => void submitDelivery()}
        >
          {busy === "submit" ? <ActivityIndicator color="#081316" /> : <Text style={styles.primaryText}>Request delivery</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.ordersHeading}>
        <Text style={styles.sectionTitle}>Your deliveries</Text>
        <TouchableOpacity onPress={() => void loadOrders()}><Text style={styles.refresh}>Refresh</Text></TouchableOpacity>
      </View>
      {orders.length === 0 ? (
        <View style={styles.empty}><Text style={styles.helper}>Your delivery requests and tracking updates will appear here.</Text></View>
      ) : orders.map((order) => (
        <View key={order._id} style={styles.orderCard}>
          <View style={styles.orderTop}>
            <Text style={styles.status}>{statusLabel[order.status]}</Text>
            <Text style={styles.fare}>{order.currency} {order.estimatedFare.toLocaleString()}</Text>
          </View>
          <Text style={styles.routeText} numberOfLines={2}>From: {order.pickupAddress}</Text>
          <Text style={styles.routeText} numberOfLines={2}>To: {order.destinationAddress}</Text>
          <Text style={styles.helper}>{order.packageType} · {order.weightKg} kg · {order.recipientName} · payment {order.paymentStatus.toLowerCase()}</Text>
          {order.driverName && <Text style={styles.driverInfo}>Courier: {order.driverName}{order.driverPhone ? ` · ${order.driverPhone}` : ""}</Text>}
          {order.driverLocation && (
            <TouchableOpacity onPress={() => {
              const [longitude, latitude] = order.driverLocation!.coordinates;
              Linking.openURL(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`)
                .catch((linkError) => setError(linkError instanceof Error ? linkError.message : "Unable to open the courier location."));
            }}>
              <Text style={styles.driverInfo}>View courier location · updated {new Date(order.driverLocation.updatedAt).toLocaleTimeString()}</Text>
            </TouchableOpacity>
          )}
          {order.status === "REQUESTED" && (
            <TouchableOpacity disabled={busy === order._id} onPress={() => void cancelOrder(order._id)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{busy === order._id ? "Cancelling…" : "Cancel request"}</Text>
            </TouchableOpacity>
          )}
          {order.status === "DELIVERED" && !order.rating && (
            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <TouchableOpacity key={score} onPress={() => setRatingDrafts((current) => ({ ...current, [order._id]: score }))}>
                    <Text style={[styles.star, (ratingDrafts[order._id] || 5) >= score && styles.starSelected]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity disabled={busy === order._id} onPress={() => void submitRating(order)}>
                <Text style={styles.refresh}>{busy === order._id ? "Saving…" : "Rate"}</Text>
              </TouchableOpacity>
            </View>
          )}
          {order.rating && <Text style={styles.helper}>Your rating: {"★".repeat(order.rating.score)}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  heading: { paddingTop: 4, paddingBottom: 2 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 26, fontWeight: "900", marginTop: 5 },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  card: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, borderRadius: 16, padding: 14, gap: 10 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "800", marginBottom: 2 },
  field: { gap: 5 },
  label: { color: "#b5c3c8", fontSize: 11, fontWeight: "700" },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#34434a", borderRadius: 10, backgroundColor: "#0d1418", paddingHorizontal: 12, color: colors.text, fontSize: 13 },
  multiline: { minHeight: 74, paddingTop: 11 },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  option: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#34434a", backgroundColor: "#0d1418" },
  optionSelected: { borderColor: colors.accent, backgroundColor: "#123138" },
  optionText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  optionTextSelected: { color: colors.accent },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 3 },
  switchCopy: { flex: 1, gap: 4, paddingRight: 10 },
  estimate: { borderRadius: 15, padding: 14, borderWidth: 1, borderColor: "#13616b", backgroundColor: "#103037" },
  estimateLabel: { color: colors.accent, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  estimateFare: { color: colors.text, fontSize: 22, fontWeight: "900", marginVertical: 4 },
  actions: { gap: 8 },
  secondaryButton: { minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.accent, fontWeight: "800", fontSize: 12 },
  primaryButton: { minHeight: 48, borderRadius: 11, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#071316", fontWeight: "900", fontSize: 13 },
  disabled: { opacity: 0.45 },
  error: { borderWidth: 1, borderColor: "#853f43", backgroundColor: "#3a1c20", borderRadius: 10, padding: 10, color: "#ffb9bd", fontSize: 11 },
  ordersHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7 },
  refresh: { color: colors.accent, fontSize: 11, fontWeight: "800" },
  empty: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, borderRadius: 14, padding: 14 },
  orderCard: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, borderRadius: 14, padding: 13, gap: 7 },
  orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  status: { color: colors.mint, fontSize: 12, fontWeight: "900" },
  fare: { color: colors.text, fontWeight: "800", fontSize: 12 },
  routeText: { color: colors.text, fontSize: 11, lineHeight: 16 },
  driverInfo: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  cancelButton: { alignSelf: "flex-start", marginTop: 2, borderWidth: 1, borderColor: "#714044", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7 },
  cancelText: { color: "#ffb9bd", fontWeight: "800", fontSize: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  stars: { flexDirection: "row", gap: 4 },
  star: { color: "#47545a", fontSize: 21 },
  starSelected: { color: "#f7b84b" },
});
