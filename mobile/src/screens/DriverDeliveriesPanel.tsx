import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import {
  DeliveryOrder,
  getDriverDeliveries,
  updateDeliveryLocation,
  updateDeliveryStatus,
} from "../api";

const activeStatuses = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"];

function nextAction(order: DeliveryOrder): { status: "PICKED_UP" | "IN_TRANSIT" | "DELIVERED"; label: string } {
  if (order.status === "ASSIGNED") return { status: "PICKED_UP", label: "Confirm parcel pickup" };
  if (order.status === "PICKED_UP") return { status: "IN_TRANSIT", label: "Start delivery" };
  return { status: "DELIVERED", label: "Confirm delivery" };
}

export function DriverDeliveriesPanel() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const activeOrders = orders.filter((order) => activeStatuses.includes(order.status));

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await getDriverDeliveries());
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load delivery jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const timer = setInterval(() => void loadOrders(), 12000);
    return () => clearInterval(timer);
  }, [loadOrders]);

  useEffect(() => {
    if (!activeOrders.length) return;
    let watcher: Location.LocationSubscription | undefined;
    let cancelled = false;
    async function watchDeliveryLocation() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Location access is required to share your delivery location.");
        return;
      }
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 50 },
        (position) => {
          const coordinates: [number, number] = [position.coords.longitude, position.coords.latitude];
          for (const order of activeOrders) {
            updateDeliveryLocation(order._id, coordinates).catch((requestError) => {
              if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to update delivery location.");
            });
          }
        },
      );
    }
    watchDeliveryLocation().catch((locationError) => {
      if (!cancelled) setError(locationError instanceof Error ? locationError.message : "Unable to access delivery location.");
    });
    return () => {
      cancelled = true;
      watcher?.remove();
    };
  }, [activeOrders.map((order) => order._id).join(",")]);

  async function advance(order: DeliveryOrder) {
    const action = nextAction(order);
    setBusy(order._id);
    setError("");
    try {
      const updated = await updateDeliveryStatus(order._id, action.status);
      if (updated.status === "DELIVERED") {
        setOrders((current) => current.filter((item) => item._id !== order._id));
        Alert.alert("Delivery completed", "The customer and Operations will see the delivery update.");
      } else {
        setOrders((current) => current.map((item) => item._id === order._id ? updated : item));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update delivery.");
    } finally {
      setBusy("");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COURIER JOBS</Text>
        <Text style={styles.title}>Assigned deliveries</Text>
        <Text style={styles.subtitle}>Pickup and delivery status updates are shared with the customer and Operations.</Text>
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {loading ? <Text style={styles.muted}>Loading delivery jobs…</Text> : activeOrders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No assigned parcels</Text>
          <Text style={styles.muted}>New jobs assigned by Operations will appear here automatically.</Text>
          <TouchableOpacity onPress={() => void loadOrders()} style={styles.refresh}><Text style={styles.refreshText}>Refresh jobs</Text></TouchableOpacity>
        </View>
      ) : activeOrders.map((order) => {
        const action = nextAction(order);
        return (
          <View key={order._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.status}>{order.status.replaceAll("_", " ")}</Text>
              <Text style={styles.fare}>{order.currency} {order.estimatedFare.toLocaleString()}</Text>
            </View>
            <Text style={styles.route}>Pickup: {order.pickupAddress}</Text>
            <Text style={styles.route}>Deliver to: {order.destinationAddress}</Text>
            <Text style={styles.details}>{order.packageType} · {order.weightKg} kg · {order.packageDescription}{order.fragile ? " · FRAGILE" : ""}</Text>
            <Text style={styles.details}>Recipient: {order.recipientName} · {order.recipientPhone}</Text>
            {!!order.notes && <Text style={styles.details}>Note: {order.notes}</Text>}
            <TouchableOpacity
              onPress={() => void Linking.openURL(`tel:${order.recipientPhone}`)}
              style={styles.callButton}
            >
              <Text style={styles.callText}>Call recipient</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy === order._id} onPress={() => void advance(order)} style={styles.action}>
              <Text style={styles.actionText}>{busy === order._id ? "Updating…" : action.label}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: "#0e1519" },
  header: { gap: 5, marginBottom: 4 },
  eyebrow: { color: "#00d4ed", fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#eaf2f4", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#92a1a9", fontSize: 11, lineHeight: 16 },
  muted: { color: "#92a1a9", fontSize: 11, lineHeight: 17 },
  error: { borderWidth: 1, borderColor: "#853f43", backgroundColor: "#3a1c20", borderRadius: 10, padding: 10, color: "#ffb9bd", fontSize: 11 },
  empty: { borderWidth: 1, borderColor: "#263238", backgroundColor: "#171e22", borderRadius: 15, padding: 15, gap: 7 },
  emptyTitle: { color: "#eaf2f4", fontWeight: "800", fontSize: 14 },
  refresh: { alignSelf: "flex-start", marginTop: 3, borderWidth: 1, borderColor: "#00d4ed", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  refreshText: { color: "#00d4ed", fontSize: 11, fontWeight: "800" },
  card: { borderWidth: 1, borderColor: "#263238", backgroundColor: "#171e22", borderRadius: 15, padding: 14, gap: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  status: { color: "#36e7bb", fontSize: 11, fontWeight: "900" },
  fare: { color: "#eaf2f4", fontWeight: "800", fontSize: 12 },
  route: { color: "#eaf2f4", fontSize: 12, lineHeight: 17 },
  details: { color: "#92a1a9", fontSize: 10, lineHeight: 15 },
  callButton: { alignSelf: "flex-start", paddingVertical: 7 },
  callText: { color: "#00d4ed", fontSize: 11, fontWeight: "800" },
  action: { minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#00d4ed", borderRadius: 10 },
  actionText: { color: "#071316", fontWeight: "900", fontSize: 12 },
});
