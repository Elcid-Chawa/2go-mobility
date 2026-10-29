import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  acceptMoverQuote,
  cancelMoverRequest,
  createMoverRequest,
  getMyMoverRequests,
  listMoverVehicles,
  MoverMove,
  MoverVehicle,
  MoverVehicleType,
  reviewMoverService,
  AuthUser,
} from "../api";

const colors = {
  background: "#0e1519",
  panel: "#171e22",
  raised: "#242e34",
  line: "#2b373d",
  accent: "#00d4ed",
  text: "#edf4f6",
  muted: "#9babb2",
  green: "#36d39a",
};
const vehicleTypes: MoverVehicleType[] = ["PICKUP", "SMALL_VAN", "MEDIUM_TRUCK", "LARGE_TRUCK", "FLATBED"];
const moveTypes = ["HOUSEHOLD", "OFFICE", "SINGLE_ITEM"] as const;

function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function statusLabel(status: MoverMove["status"]) {
  return status.replaceAll("_", " ");
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`;
}

export function MoversHomeScreen({ user }: { user: AuthUser }) {
  const initialDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return localDateTime(tomorrow);
  }, []);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [appliedCity, setAppliedCity] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [moveDate, setMoveDate] = useState(initialDate.date);
  const [moveTime, setMoveTime] = useState(initialDate.time);
  const [moveType, setMoveType] = useState<(typeof moveTypes)[number]>("HOUSEHOLD");
  const [bedrooms, setBedrooms] = useState("2");
  const [crewRequired, setCrewRequired] = useState("2");
  const [estimatedVolumeM3, setEstimatedVolumeM3] = useState("15");
  const [pickupFloor, setPickupFloor] = useState("0");
  const [destinationFloor, setDestinationFloor] = useState("0");
  const [pickupElevator, setPickupElevator] = useState(false);
  const [destinationElevator, setDestinationElevator] = useState(false);
  const [durationHours, setDurationHours] = useState("4");
  const [preferredVehicleType, setPreferredVehicleType] = useState<MoverVehicleType | "">("");
  const [inventoryNotes, setInventoryNotes] = useState("");
  const [vehicles, setVehicles] = useState<MoverVehicle[]>([]);
  const [moves, setMoves] = useState<MoverMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [availableVehicles, requests] = await Promise.all([
        listMoverVehicles(appliedCity),
        getMyMoverRequests(),
      ]);
      setVehicles(availableVehicles);
      setMoves(requests);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load moving services.");
    } finally {
      setLoading(false);
    }
  }, [appliedCity]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitRequest() {
    setWorking(true);
    setError("");
    try {
      const scheduledAt = new Date(`${moveDate}T${moveTime}:00`);
      if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        throw new Error("Choose a valid future move date and time.");
      }
      if (!pickupAddress.trim() || !pickupCity.trim() || !destinationAddress.trim() || !destinationCity.trim()) {
        throw new Error("Enter both pickup and destination addresses and cities.");
      }
      await createMoverRequest({
        customerName: user.name,
        customerPhone: user.phone,
        pickupAddress: pickupAddress.trim(),
        pickupCity: pickupCity.trim(),
        destinationAddress: destinationAddress.trim(),
        destinationCity: destinationCity.trim(),
        scheduledAt: scheduledAt.toISOString(),
        estimatedDurationHours: Number(durationHours),
        moveType,
        bedrooms: Number(bedrooms),
        crewRequired: Number(crewRequired),
        estimatedVolumeM3: Number(estimatedVolumeM3),
        pickupFloor: Number(pickupFloor),
        destinationFloor: Number(destinationFloor),
        pickupElevator,
        destinationElevator,
        preferredVehicleType: preferredVehicleType || undefined,
        inventoryNotes: inventoryNotes.trim(),
      });
      setPickupAddress("");
      setDestinationAddress("");
      setInventoryNotes("");
      Alert.alert("Move request sent", "Approved moving agencies can now send you quotes.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit your move request.");
    } finally {
      setWorking(false);
    }
  }

  async function acceptQuote(move: MoverMove, quoteId: string) {
    setWorking(true);
    setError("");
    try {
      await acceptMoverQuote(move._id, quoteId);
      await refresh();
      Alert.alert("Quote accepted", "Your vehicle is reserved. The agency will contact you to coordinate the move.");
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Unable to accept this quote.");
    } finally {
      setWorking(false);
    }
  }

  function confirmCancel(move: MoverMove) {
    Alert.alert("Cancel move request?", "This only cancels requests that have not been assigned.", [
      { text: "Keep request", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: () => {
          setWorking(true);
          void cancelMoverRequest(move._id)
            .then(refresh)
            .catch((cancelError: unknown) => setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel the move request."))
            .finally(() => setWorking(false));
        },
      },
    ]);
  }

  async function submitReview(move: MoverMove) {
    setWorking(true);
    setError("");
    try {
      await reviewMoverService(move._id, rating, review.trim());
      setReview("");
      await refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to submit your review.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>2GO MOBILITY</Text>
          <Text style={styles.title}>Moving made easier</Text>
          <Text style={styles.subtitle}>Tell us what you need moved. Compare vehicle and crew quotes from approved agencies.</Text>
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Where are you moving?</Text>
          <Field label="Pickup address" value={pickupAddress} onChange={setPickupAddress} placeholder="Street, building or landmark" />
          <View style={styles.cityRow}>
            <View style={styles.cityField}><Field label="Pickup city" value={pickupCity} onChange={setPickupCity} placeholder="e.g. Kigali" /></View>
            <TouchableOpacity onPress={() => setAppliedCity(pickupCity)} style={styles.citySearch}><Text style={styles.citySearchText}>Find vehicles</Text></TouchableOpacity>
          </View>
          <Field label="Destination address" value={destinationAddress} onChange={setDestinationAddress} placeholder="Street, building or landmark" />
          <Field label="Destination city" value={destinationCity} onChange={setDestinationCity} placeholder="e.g. Musanze" />

          <View style={styles.twoColumns}>
            <Field label="Move date (YYYY-MM-DD)" value={moveDate} onChange={setMoveDate} placeholder="2026-11-01" />
            <Field label="Start time (HH:mm)" value={moveTime} onChange={setMoveTime} placeholder="09:00" />
            <Field label="Estimated hours" value={durationHours} onChange={setDurationHours} keyboardType="number-pad" />
            <Field label="Crew needed" value={crewRequired} onChange={setCrewRequired} keyboardType="number-pad" />
            <Field label="Estimated load (m³)" value={estimatedVolumeM3} onChange={setEstimatedVolumeM3} keyboardType="number-pad" />
          </View>

          <Text style={[styles.fieldLabel, styles.spaced]}>Move type</Text>
          <View style={styles.chipRow}>
            {moveTypes.map((option) => (
              <Chip key={option} selected={moveType === option} label={option.replace("_", " ")} onPress={() => setMoveType(option)} />
            ))}
          </View>

          <Text style={[styles.fieldLabel, styles.spaced]}>Preferred vehicle (optional)</Text>
          <View style={styles.chipRow}>
            <Chip selected={!preferredVehicleType} label="Agency recommends" onPress={() => setPreferredVehicleType("")} />
            {vehicleTypes.map((option) => (
              <Chip key={option} selected={preferredVehicleType === option} label={option.replaceAll("_", " ")} onPress={() => setPreferredVehicleType(option)} />
            ))}
          </View>

          <View style={styles.twoColumns}>
            <Field label="Bedrooms (household)" value={bedrooms} onChange={setBedrooms} keyboardType="number-pad" />
            <Field label="Items / inventory notes" value={inventoryNotes} onChange={setInventoryNotes} placeholder="Boxes, furniture, appliances…" />
            <Field label="Pickup floor" value={pickupFloor} onChange={setPickupFloor} keyboardType="number-pad" />
            <Field label="Destination floor" value={destinationFloor} onChange={setDestinationFloor} keyboardType="number-pad" />
          </View>
          <View style={styles.chipRow}>
            <Chip selected={pickupElevator} label="Pickup has elevator" onPress={() => setPickupElevator(!pickupElevator)} />
            <Chip selected={destinationElevator} label="Destination has elevator" onPress={() => setDestinationElevator(!destinationElevator)} />
          </View>
          <Text style={styles.hint}>Agencies will quote the full move, including vehicle and crew. You choose the offer that suits you.</Text>
          <TouchableOpacity disabled={working} onPress={() => void submitRequest()} style={[styles.primaryButton, working && styles.disabled]}>
            <Text style={styles.primaryText}>{working ? "Sending request…" : "Request agency quotes"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Available moving vehicles</Text>
            <Text style={styles.hint}>Approved trucks and their capacity in {appliedCity.trim() || "all cities"}.</Text>
          </View>
          <TouchableOpacity onPress={() => void refresh()} accessibilityLabel="Refresh moving vehicles and requests">
            <Text style={styles.link}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : vehicles.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.cardTitle}>No listed vehicles yet</Text><Text style={styles.hint}>You can still submit a request. Agencies will respond when they have a suitable vehicle.</Text></View>
        ) : vehicles.map((vehicle) => (
          <View key={vehicle._id} style={styles.vehicleCard}>
            <View style={styles.vehicleIcon}><Text style={styles.vehicleGlyph}>▰</Text></View>
            <View style={styles.vehicleDetails}>
              <Text style={styles.cardTitle}>{vehicle.vehicleType.replaceAll("_", " ")} · {vehicle.make} {vehicle.model}</Text>
              <Text style={styles.hint}>{vehicle.city} · up to {vehicle.capacityKg.toLocaleString()} kg · {vehicle.volumeM3} m³ · crew up to {vehicle.crewCapacity}</Text>
              <Text style={styles.agencyName}>{vehicle.agency?.name || "Approved moving agency"}</Text>
            </View>
          </View>
        ))}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Your move requests</Text>
          <Text style={styles.count}>{moves.length}</Text>
        </View>
        {!loading && moves.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.cardTitle}>No move requests yet</Text><Text style={styles.hint}>Send a request above to receive agency quotes.</Text></View>
        ) : moves.map((move) => (
          <View key={move._id} style={styles.moveCard}>
            <View style={styles.moveHeader}>
              <Text style={styles.cardTitle}>{move.pickupCity} → {move.destinationCity}</Text>
              <Text style={[styles.status, move.status === "COMPLETED" ? styles.statusDone : null]}>{statusLabel(move.status)}</Text>
            </View>
            <Text style={styles.hint}>{move.pickupAddress} → {move.destinationAddress}</Text>
            <Text style={styles.hint}>{new Date(move.scheduledAt).toLocaleString()} · {move.moveType.replace("_", " ")} · {move.crewRequired} helpers</Text>
            {move.preferredVehicleType && <Text style={styles.hint}>Requested: {move.preferredVehicleType.replaceAll("_", " ")}</Text>}
            {(move.quotes || []).map((quote) => (
              <View key={quote._id} style={styles.quoteCard}>
                <View style={styles.moveHeader}>
                  <Text style={styles.quoteAmount}>{money(quote.amount, quote.currency)}</Text>
                  <Text style={styles.hint}>{quote.crewCount} helpers</Text>
                </View>
                <Text style={styles.cardTitle}>{quote.agencyId?.name || "Moving agency"}</Text>
                <Text style={styles.hint}>{quote.vehicleId?.vehicleType?.replaceAll("_", " ")} · {quote.vehicleId?.make} {quote.vehicleId?.model} · {quote.vehicleId?.capacityKg?.toLocaleString()} kg / {quote.vehicleId?.volumeM3} m³</Text>
                {quote.message ? <Text style={styles.hint}>{quote.message}</Text> : null}
                <Text style={styles.hint}>Valid until {new Date(quote.validUntil).toLocaleString()}</Text>
                {move.status === "OPEN" || move.status === "QUOTED" ? (
                  <TouchableOpacity disabled={working || quote.status !== "PROPOSED"} onPress={() => void acceptQuote(move, quote._id)} style={[styles.acceptButton, working && styles.disabled]}>
                    <Text style={styles.acceptText}>{quote.status === "PROPOSED" ? "Choose this quote" : quote.status}</Text>
                  </TouchableOpacity>
                ) : quote.status === "ACCEPTED" ? (
                  <Text style={styles.accepted}>Selected · contact {quote.agencyId?.phone || "the agency"} to coordinate</Text>
                ) : null}
              </View>
            ))}
            {(move.status === "OPEN" || move.status === "QUOTED") && (
              <TouchableOpacity onPress={() => confirmCancel(move)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel request</Text></TouchableOpacity>
            )}
            {move.status === "COMPLETED" && !move.rating && (
              <View style={styles.reviewBox}>
                <Text style={styles.fieldLabel}>Rate your move</Text>
                <View style={styles.chipRow}>{[1, 2, 3, 4, 5].map((value) => <Chip key={value} selected={rating === value} label={`${value} ★`} onPress={() => setRating(value)} />)}</View>
                <Field label="Comment (optional)" value={review} onChange={setReview} placeholder="How did it go?" />
                <TouchableOpacity disabled={working} onPress={() => void submitReview(move)} style={styles.acceptButton}><Text style={styles.acceptText}>Submit review</Text></TouchableOpacity>
              </View>
            )}
            {move.rating ? <Text style={styles.accepted}>Your rating: {move.rating} ★ {move.review}</Text> : null}
            {move.status === "COMPLETED" && <Text style={styles.hint}>Payment: {move.paymentStatus} · Operations records cash payments.</Text>}
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboardType?: "number-pad" | "default";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType || "default"}
        style={styles.input}
        autoCapitalize="sentences"
      />
    </View>
  );
}

function Chip({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 120 },
  header: { marginBottom: 18 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 25, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 5, lineHeight: 18 },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  field: { flex: 1, minWidth: "46%", marginTop: 12 },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  input: { minHeight: 44, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line, color: colors.text, borderRadius: 10, paddingHorizontal: 12, marginTop: 6, fontSize: 13 },
  twoColumns: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  cityRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  cityField: { flex: 1 },
  citySearch: { backgroundColor: colors.raised, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, marginTop: 12, borderWidth: 1, borderColor: colors.line },
  citySearchText: { color: colors.accent, fontSize: 10, fontWeight: "900" },
  spaced: { marginTop: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  chip: { backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8 },
  chipSelected: { backgroundColor: "#0c2830", borderColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  chipTextSelected: { color: colors.accent },
  hint: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  primaryButton: { backgroundColor: colors.accent, borderRadius: 11, alignItems: "center", paddingVertical: 14, marginTop: 16 },
  primaryText: { color: colors.background, fontSize: 12, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10 },
  link: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  count: { color: colors.accent, fontSize: 12, fontWeight: "900" },
  loader: { marginVertical: 22 },
  emptyCard: { backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16 },
  cardTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  vehicleCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, marginBottom: 9, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  vehicleIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.raised, justifyContent: "center", alignItems: "center" },
  vehicleGlyph: { color: colors.accent, fontSize: 22 },
  vehicleDetails: { flex: 1 },
  agencyName: { color: colors.green, fontSize: 10, fontWeight: "800", marginTop: 5 },
  moveCard: { padding: 14, marginBottom: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 15 },
  moveHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  status: { color: "#f4cd7a", backgroundColor: "#413419", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, fontSize: 8, fontWeight: "900", overflow: "hidden" },
  statusDone: { color: colors.green, backgroundColor: "#13372e" },
  quoteCard: { marginTop: 11, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#2e5960", backgroundColor: "#111e22" },
  quoteAmount: { color: colors.accent, fontSize: 16, fontWeight: "900" },
  acceptButton: { alignItems: "center", backgroundColor: colors.accent, paddingVertical: 10, borderRadius: 9, marginTop: 10 },
  acceptText: { color: colors.background, fontSize: 11, fontWeight: "900" },
  accepted: { color: colors.green, fontSize: 11, fontWeight: "800", marginTop: 10 },
  cancelButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#73343c", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
  cancelText: { color: "#ffb5bd", fontSize: 10, fontWeight: "800" },
  reviewBox: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: colors.line },
  error: { color: "#ffc4c4", backgroundColor: "#37191d", borderRadius: 10, padding: 11, fontSize: 11, marginBottom: 12 },
});
