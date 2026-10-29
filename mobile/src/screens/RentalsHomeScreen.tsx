import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  createRentalBooking,
  cancelRentalBooking,
  getMyRentalBookings,
  getRentalLicense,
  listRentalVehicles,
  quoteRental,
  RentalBooking,
  RentalCategory,
  RentalLicense,
  RentalQuote,
  RentalVehicle,
  submitRentalLicense,
  uploadRentalLicenseDocument,
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
const categories: RentalCategory[] = ["ECONOMY", "COMPACT", "SEDAN", "SUV", "LUXURY", "VAN"];

function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function bookingDate(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || month > 12 || !day || hour === undefined || minute === undefined || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Enter dates as YYYY-MM-DD and times as 24-hour HH:mm.");
  }
  const result = new Date(year, month - 1, day, hour, minute);
  if (
    !Number.isFinite(result.getTime()) ||
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) throw new Error("Enter a valid rental date and time.");
  return result.toISOString();
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`;
}

export function RentalsHomeScreen() {
  const initialStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    return localDateTime(date);
  }, []);
  const initialEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    date.setHours(9, 0, 0, 0);
    return localDateTime(date);
  }, []);
  const [view, setView] = useState<"CARS" | "BOOKINGS">("CARS");
  const [city, setCity] = useState("");
  const [appliedCity, setAppliedCity] = useState("");
  const [category, setCategory] = useState<RentalCategory | "">("");
  const [vehicles, setVehicles] = useState<RentalVehicle[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [license, setLicense] = useState<RentalLicense | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseCountry, setLicenseCountry] = useState("Rwanda");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [startDate, setStartDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [driverOption, setDriverOption] = useState<"SELF_DRIVE" | "WITH_DRIVER">("SELF_DRIVE");
  const [selectedVehicle, setSelectedVehicle] = useState<RentalVehicle | null>(null);
  const [quote, setQuote] = useState<RentalQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const vehicleList = await listRentalVehicles({ city: appliedCity, category: category || undefined });
      setVehicles(vehicleList);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load rental vehicles.");
    } finally {
      setLoading(false);
    }
  }, [appliedCity, category]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await getMyRentalBookings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your rental bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "CARS") void loadVehicles();
    else void loadBookings();
  }, [view, loadVehicles, loadBookings]);

  useEffect(() => {
    getRentalLicense()
      .then((currentLicense) => {
        setLicense(currentLicense);
        setLicenseNumber(currentLicense?.licenseNumber || "");
        setLicenseCountry(currentLicense?.issuingCountry || "Rwanda");
        setLicenseExpiry(currentLicense?.expiresAt ? currentLicense.expiresAt.slice(0, 10) : "");
      })
      .catch((licenseError) => setError(licenseError instanceof Error ? licenseError.message : "Unable to load your driving licence status."));
  }, []);

  function chooseVehicle(vehicle: RentalVehicle) {
    setSelectedVehicle(vehicle);
    setQuote(null);
    setError("");
  }

  async function saveLicense() {
    setWorking(true);
    setError("");
    try {
      const expiresAt = new Date(`${licenseExpiry}T23:59:59`).toISOString();
      const result = await submitRentalLicense({
        licenseNumber: licenseNumber.trim(),
        issuingCountry: licenseCountry.trim(),
        expiresAt,
      });
      setLicense(result);
      Alert.alert("Licence submitted", "Operations will review your driving licence before you can book self-drive.");
    } catch (licenseError) {
      setError(licenseError instanceof Error ? licenseError.message : "Unable to submit your licence.");
    } finally {
      setWorking(false);
    }
  }

  async function uploadLicenseDocument() {
    setError("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets[0]) return;
      setWorking(true);
      const file = picked.assets[0];
      setLicense(await uploadRentalLicenseDocument({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        file: file.file,
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the driving licence.");
    } finally {
      setWorking(false);
    }
  }

  async function requestQuote() {
    if (!selectedVehicle) return;
    setWorking(true);
    setError("");
    try {
      const startAt = bookingDate(startDate, startTime);
      const endAt = bookingDate(endDate, endTime);
      setQuote(await quoteRental({ vehicleId: selectedVehicle._id, startAt, endAt, driverOption }));
    } catch (quoteError) {
      setError(quoteError instanceof Error ? quoteError.message : "Unable to calculate a rental quote.");
      setQuote(null);
    } finally {
      setWorking(false);
    }
  }

  async function bookVehicle() {
    if (!selectedVehicle || !quote) return;
    setWorking(true);
    setError("");
    try {
      const startAt = bookingDate(startDate, startTime);
      const endAt = bookingDate(endDate, endTime);
      const booking = await createRentalBooking({
        vehicleId: selectedVehicle._id,
        startAt,
        endAt,
        driverOption,
        expectedRentalAmount: quote.rentalAmount,
        expectedDriverAmount: quote.driverAmount,
        expectedSecurityDeposit: quote.securityDeposit,
        expectedTotalDue: quote.totalDue,
        expectedCurrency: quote.currency,
      });
      Alert.alert("Booking requested", "The rental agency must confirm availability. Payment is handled in cash and confirmed by Operations.");
      setSelectedVehicle(null);
      setQuote(null);
      setView("BOOKINGS");
      setBookings((current) => [booking, ...current]);
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : "Unable to request this rental.");
    } finally {
      setWorking(false);
    }
  }

  async function cancelBooking(booking: RentalBooking) {
    setWorking(true);
    setError("");
    try {
      const updated = await cancelRentalBooking(booking._id);
      setBookings((current) => current.map((item) => item._id === updated._id ? updated : item));
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel this booking.");
    } finally {
      setWorking(false);
    }
  }

  function confirmCancelBooking(booking: RentalBooking) {
    Alert.alert(
      "Cancel rental request?",
      "You can cancel while the agency has not confirmed the booking.",
      [
        { text: "Keep request", style: "cancel" },
        { text: "Cancel request", style: "destructive", onPress: () => void cancelBooking(booking) },
      ],
    );
  }

  const startISO = (() => {
    try { return bookingDate(startDate, startTime); } catch { return ""; }
  })();
  const endISO = (() => {
    try { return bookingDate(endDate, endTime); } catch { return ""; }
  })();
  const licenseValidForPeriod = Boolean(
    license?.status === "VERIFIED" &&
    endISO &&
    new Date(license.expiresAt).getTime() > new Date(endISO).getTime(),
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>2GO MOBILITY</Text>
            <Text style={styles.title}>Auto rentals</Text>
            <Text style={styles.subtitle}>Choose a car, dates and how you want to travel.</Text>
          </View>
          <TouchableOpacity style={styles.backButton} onPress={() => setView(view === "CARS" ? "BOOKINGS" : "CARS")}>
            <Text style={styles.backButtonText}>{view === "CARS" ? "My bookings" : "Browse cars"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.switchRow}>
          {(["CARS", "BOOKINGS"] as const).map((item) => (
            <TouchableOpacity key={item} onPress={() => setView(item)} style={[styles.switchButton, view === item && styles.switchActive]}>
              <Text style={[styles.switchText, view === item && styles.switchTextActive]}>{item === "CARS" ? "Find a car" : "My bookings"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        {view === "CARS" ? (
          <>
            <View style={styles.filterCard}>
              <Text style={styles.sectionTitle}>Where and what?</Text>
              <View style={styles.searchRow}>
                <TextInput value={city} onChangeText={setCity} placeholder="City (e.g. Kigali)" placeholderTextColor={colors.muted} style={[styles.textInput, styles.cityInput]} returnKeyType="search" onSubmitEditing={() => { setSelectedVehicle(null); setQuote(null); setAppliedCity(city); }} />
                <TouchableOpacity onPress={() => { setSelectedVehicle(null); setQuote(null); setAppliedCity(city); }} style={styles.searchButton}><Text style={styles.searchButtonText}>Search</Text></TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                <TouchableOpacity onPress={() => { setSelectedVehicle(null); setQuote(null); setCategory(""); }} style={[styles.categoryChip, !category && styles.categorySelected]}><Text style={[styles.categoryText, !category && styles.categoryTextSelected]}>All cars</Text></TouchableOpacity>
                {categories.map((item) => (
                  <TouchableOpacity key={item} onPress={() => { setSelectedVehicle(null); setQuote(null); setCategory(item); }} style={[styles.categoryChip, category === item && styles.categorySelected]}>
                    <Text style={[styles.categoryText, category === item && styles.categoryTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available vehicles</Text>
              <TouchableOpacity onPress={() => void loadVehicles()}><Text style={styles.linkText}>Refresh</Text></TouchableOpacity>
            </View>
            {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : vehicles.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No rentals found</Text><Text style={styles.muted}>Try another city or remove the category filter.</Text></View>
            ) : vehicles.map((vehicle) => (
              <TouchableOpacity key={vehicle._id} onPress={() => chooseVehicle(vehicle)} style={[styles.vehicleCard, selectedVehicle?._id === vehicle._id && styles.vehicleSelected]}>
                {vehicle.photoUrl ? <Image source={{ uri: vehicle.photoUrl }} style={styles.vehicleImage} /> : <View style={styles.vehiclePlaceholder}><Text style={styles.carGlyph}>▰</Text></View>}
                <View style={styles.vehicleInfo}>
                  <View style={styles.vehicleTitleRow}>
                    <Text style={styles.vehicleTitle}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
                    <Text style={styles.vehicleCategory}>{vehicle.category}</Text>
                  </View>
                  <Text style={styles.muted}>{vehicle.city} · {vehicle.seats} seats · {vehicle.transmission.toLowerCase()}</Text>
                  <Text style={styles.agencyName}>{vehicle.agency.name}</Text>
                  <Text style={styles.price}>{money(vehicle.rate.dailyRate, vehicle.rate.currency)} <Text style={styles.priceSuffix}>/ day</Text></Text>
                </View>
              </TouchableOpacity>
            ))}

            {selectedVehicle && (
              <View style={styles.bookingCard}>
                <Text style={styles.sectionTitle}>Rental details</Text>
                <Text style={styles.selectedLabel}>{selectedVehicle.make} {selectedVehicle.model} · {selectedVehicle.agency.name}</Text>
                <View style={styles.dateGrid}>
                  <DateField label="Pickup date (YYYY-MM-DD)" value={startDate} onChange={(value) => { setStartDate(value); setQuote(null); }} />
                  <DateField label="Pickup time (HH:mm)" value={startTime} onChange={(value) => { setStartTime(value); setQuote(null); }} placeholder="09:00" />
                  <DateField label="Return date (YYYY-MM-DD)" value={endDate} onChange={(value) => { setEndDate(value); setQuote(null); }} />
                  <DateField label="Return time (HH:mm)" value={endTime} onChange={(value) => { setEndTime(value); setQuote(null); }} placeholder="09:00" />
                </View>
                <View style={styles.optionRow}>
                  {(["SELF_DRIVE", "WITH_DRIVER"] as const).map((option) => (
                    <TouchableOpacity key={option} onPress={() => { setDriverOption(option); setQuote(null); }} style={[styles.optionButton, driverOption === option && styles.optionSelected]}>
                      <Text style={[styles.optionTitle, driverOption === option && styles.optionTitleSelected]}>{option === "SELF_DRIVE" ? "I'll drive" : "With a driver"}</Text>
                      <Text style={styles.optionDetail}>{option === "SELF_DRIVE" ? "Verified licence required" : `+${money(selectedVehicle.rate.chauffeurDailyRate, selectedVehicle.rate.currency)}/day`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {driverOption === "SELF_DRIVE" && !licenseValidForPeriod && (
                  <View style={styles.licenseBox}>
                    <Text style={styles.licenseTitle}>Driving licence verification</Text>
                    <Text style={styles.muted}>{license?.status === "PENDING" ? "Your submitted licence is awaiting Operations review." : "Submit your driving licence details. Self-drive booking is available after verification."}</Text>
                    <TextInput value={licenseNumber} onChangeText={setLicenseNumber} placeholder="Licence number" placeholderTextColor={colors.muted} style={styles.textInput} />
                    <View style={styles.dateGrid}>
                      <TextInput value={licenseCountry} onChangeText={setLicenseCountry} placeholder="Issuing country" placeholderTextColor={colors.muted} style={styles.textInput} />
                      <TextInput value={licenseExpiry} onChangeText={setLicenseExpiry} placeholder="Expiry YYYY-MM-DD" placeholderTextColor={colors.muted} style={styles.textInput} />
                    </View>
                    {license?.status !== "PENDING" && (
                      <TouchableOpacity disabled={working || !licenseNumber.trim() || !licenseExpiry.trim()} onPress={() => void saveLicense()} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>{working ? "Submitting…" : "Submit licence for review"}</Text>
                      </TouchableOpacity>
                    )}
                    {license && !license.documentFilename && (
                      <TouchableOpacity disabled={working} onPress={() => void uploadLicenseDocument()} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>{working ? "Uploading…" : "Upload licence image or PDF"}</Text>
                      </TouchableOpacity>
                    )}
                    {license?.documentFilename ? <Text style={styles.licenseNote}>Licence document uploaded. Operations review is pending.</Text> : null}
                    {license?.reviewNotes ? <Text style={styles.licenseNote}>Review note: {license.reviewNotes}</Text> : null}
                  </View>
                )}

                <TouchableOpacity
                  disabled={working || !startISO || !endISO || (driverOption === "SELF_DRIVE" && !licenseValidForPeriod)}
                  onPress={() => void requestQuote()}
                  style={[styles.primaryButton, (working || !startISO || !endISO || (driverOption === "SELF_DRIVE" && !licenseValidForPeriod)) && styles.disabled]}
                >
                  <Text style={styles.primaryButtonText}>{working ? "Calculating…" : "Check price and availability"}</Text>
                </TouchableOpacity>

                {quote && (
                  <View style={styles.quoteBox}>
                    <Text style={styles.quoteHeading}>Quote · {quote.units} {quote.billingUnit.toLowerCase()} unit(s)</Text>
                    <PriceRow label="Vehicle rental" value={money(quote.rentalAmount, quote.currency)} />
                    {quote.driverAmount > 0 && <PriceRow label="Chauffeur" value={money(quote.driverAmount, quote.currency)} />}
                    <PriceRow label="Security deposit" value={money(quote.securityDeposit, quote.currency)} />
                    <View style={styles.quoteTotal}><Text style={styles.quoteTotalLabel}>Due at pickup</Text><Text style={styles.quoteTotalValue}>{money(quote.totalDue, quote.currency)}</Text></View>
                    <Text style={styles.muted}>Final availability is confirmed by the agency. Cash/manual payment is confirmed by Operations.</Text>
                    <TouchableOpacity disabled={working} onPress={() => void bookVehicle()} style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>{working ? "Requesting…" : "Request this rental"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={styles.bookingList}>
            {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : bookings.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No bookings yet</Text><Text style={styles.muted}>Your rental requests will appear here.</Text></View>
            ) : bookings.map((booking) => {
              const vehicle = booking.vehicleId;
              return (
                <View key={booking._id} style={styles.historyCard}>
                  <View style={styles.vehicleTitleRow}>
                    <Text style={styles.vehicleTitle}>{vehicle.make} {vehicle.model}</Text>
                    <Text style={[styles.statusChip, booking.status === "CONFIRMED" ? styles.statusConfirmed : styles.statusPending]}>{booking.status.replaceAll("_", " ")}</Text>
                  </View>
                  <Text style={styles.muted}>{booking.agencyId.name} · {booking.driverOption === "SELF_DRIVE" ? "Self-drive" : `Chauffeur${booking.driverId ? `: ${booking.driverId.name}` : ""}`}</Text>
                  <Text style={styles.muted}>{new Date(booking.startAt).toLocaleString()} → {new Date(booking.endAt).toLocaleString()}</Text>
                  <View style={styles.historyTotal}><Text style={styles.muted}>Total · {booking.paymentStatus}</Text><Text style={styles.price}>{money(booking.totalDue, booking.currency)}</Text></View>
                  {booking.status === "PENDING_AGENCY" && booking.paymentStatus === "PENDING" && (
                    <TouchableOpacity disabled={working} onPress={() => confirmCancelBooking(booking)} style={styles.cancelButton}>
                      <Text style={styles.cancelText}>Cancel request</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DateField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.textInput} autoCapitalize="none" />
    </View>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.priceRow}><Text style={styles.muted}>{label}</Text><Text style={styles.priceRowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 25, fontWeight: "900", marginTop: 4 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 5, maxWidth: 240, lineHeight: 18 },
  backButton: { backgroundColor: colors.raised, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  backButtonText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  switchRow: { flexDirection: "row", backgroundColor: colors.panel, borderRadius: 12, padding: 4, marginBottom: 16 },
  switchButton: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
  switchActive: { backgroundColor: colors.raised },
  switchText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  switchTextActive: { color: colors.text },
  filterCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 14 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  textInput: { minHeight: 44, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line, color: colors.text, borderRadius: 10, paddingHorizontal: 12, marginTop: 9, fontSize: 13 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cityInput: { flex: 1 },
  searchButton: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, marginTop: 9 },
  searchButtonText: { color: colors.background, fontSize: 11, fontWeight: "900" },
  categoryRow: { gap: 8, paddingTop: 12 },
  categoryChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.raised },
  categorySelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  categoryTextSelected: { color: colors.background },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 10 },
  linkText: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  loader: { marginVertical: 28 },
  emptyCard: { padding: 20, backgroundColor: colors.panel, borderRadius: 14, alignItems: "center", marginTop: 10 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900", marginBottom: 6 },
  muted: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  vehicleCard: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 16, marginBottom: 10, overflow: "hidden" },
  vehicleSelected: { borderColor: colors.accent, borderWidth: 2 },
  vehicleImage: { width: "100%", height: 145, backgroundColor: colors.raised },
  vehiclePlaceholder: { height: 90, justifyContent: "center", alignItems: "center", backgroundColor: colors.raised },
  carGlyph: { color: colors.accent, fontSize: 36 },
  vehicleInfo: { padding: 13 },
  vehicleTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  vehicleTitle: { color: colors.text, fontSize: 14, fontWeight: "900", flexShrink: 1 },
  vehicleCategory: { color: colors.accent, fontSize: 9, fontWeight: "900" },
  agencyName: { color: colors.green, fontSize: 11, fontWeight: "700", marginTop: 5 },
  price: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 8 },
  priceSuffix: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  bookingCard: { backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1, borderRadius: 16, marginTop: 12, padding: 14 },
  selectedLabel: { color: colors.accent, fontSize: 12, fontWeight: "800", marginTop: 6 },
  dateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 },
  dateField: { width: "48%" },
  dateLabel: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  optionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  optionButton: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, padding: 11 },
  optionSelected: { borderColor: colors.accent, backgroundColor: "#0c2830" },
  optionTitle: { color: colors.muted, fontSize: 11, fontWeight: "900" },
  optionTitleSelected: { color: colors.accent },
  optionDetail: { color: colors.muted, fontSize: 9, marginTop: 5 },
  licenseBox: { borderRadius: 12, borderWidth: 1, borderColor: "#654f2a", backgroundColor: "#241d13", padding: 12, marginTop: 14 },
  licenseTitle: { color: "#f7cc78", fontSize: 12, fontWeight: "900", marginBottom: 5 },
  licenseNote: { color: "#f7cc78", fontSize: 10, marginTop: 8 },
  secondaryButton: { backgroundColor: "#ead29c", borderRadius: 10, padding: 11, alignItems: "center", marginTop: 10 },
  secondaryButtonText: { color: "#241d13", fontSize: 11, fontWeight: "900" },
  primaryButton: { backgroundColor: colors.accent, borderRadius: 11, paddingVertical: 13, alignItems: "center", marginTop: 14 },
  primaryButtonText: { color: colors.background, fontSize: 12, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  quoteBox: { marginTop: 14, padding: 12, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  quoteHeading: { color: colors.text, fontSize: 13, fontWeight: "900", marginBottom: 10 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  priceRowValue: { color: colors.text, fontSize: 11, fontWeight: "800" },
  quoteTotal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, marginTop: 4 },
  quoteTotalLabel: { color: colors.text, fontSize: 12, fontWeight: "900" },
  quoteTotalValue: { color: colors.accent, fontSize: 15, fontWeight: "900" },
  bookingList: { gap: 10 },
  historyCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, gap: 7 },
  statusChip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden", fontSize: 8, fontWeight: "900" },
  statusConfirmed: { color: colors.green, backgroundColor: "#13372e" },
  statusPending: { color: "#f4cd7a", backgroundColor: "#413419" },
  historyTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: colors.line, paddingTop: 8 },
  cancelButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#73343c", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginTop: 2 },
  cancelText: { color: "#ffb5bd", fontSize: 10, fontWeight: "800" },
  error: { color: "#ffc4c4", backgroundColor: "#37191d", borderRadius: 10, padding: 11, fontSize: 11, marginBottom: 12 },
});
