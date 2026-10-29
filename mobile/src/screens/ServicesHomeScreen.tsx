import React from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthUser, MapCoordinate, Trip } from "../api";

const palette = {
  background: "#0e1519",
  panel: "#1a2227",
  raised: "#252e34",
  line: "#2a343a",
  cyan: "#00d4ed",
  mint: "#36e7bb",
  text: "#e8eef1",
  muted: "#a2afb5",
};

type ServiceKey = "rides" | "delivery" | "shopping" | "movers" | "rentals";

const services: {
  key: ServiceKey;
  title: string;
  description: string;
  icon: string;
  label: string;
}[] = [
  {
    key: "delivery",
    title: "Delivery Express",
    description: "Send parcels and goods across your city.",
    icon: "▣",
    label: "COMING SOON",
  },
  {
    key: "shopping",
    title: "Shop 2Go",
    description: "Shop local stores from one place.",
    icon: "▤",
    label: "COMING SOON",
  },
  {
    key: "movers",
    title: "Relocation",
    description: "Plan a move with the right-sized crew.",
    icon: "⇧",
    label: "BOOK NOW",
  },
  {
    key: "rentals",
    title: "Auto Rentals",
    description: "Find a vehicle for your next journey.",
    icon: "⌑",
    label: "BOOK NOW",
  },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

function tripStatus(status: Trip["status"]): string {
  switch (status) {
    case "SEARCHING_DRIVER":
      return "Finding your driver";
    case "TRIP_STARTED":
      return "Your ride is in progress";
    default:
      return "Your ride is active";
  }
}

export function ServicesHomeScreen({
  user,
  currentLocation,
  activeTrip,
  onSelectRide,
  onSelectRentals,
  onSelectMovers,
  onSelectActivity,
  onSelectAccount,
}: {
  user: AuthUser;
  currentLocation: MapCoordinate | null;
  activeTrip: Trip | null;
  onSelectRide: () => void;
  onSelectRentals: () => void;
  onSelectMovers: () => void;
  onSelectActivity: () => void;
  onSelectAccount: () => void;
}) {
  const hasActiveTrip =
    activeTrip !== null &&
    !["TRIP_COMPLETED", "PAYMENT_PENDING", "PAID", "RATED", "CANCELLED"].includes(
      activeTrip.status,
    );
  const initials = firstName(user.name).slice(0, 1).toUpperCase();

  function selectService(key: ServiceKey) {
    if (key === "rides") {
      onSelectRide();
      return;
    }
    if (key === "rentals") {
      onSelectRentals();
      return;
    }
    if (key === "movers") {
      onSelectMovers();
      return;
    }
    Alert.alert(
      "Coming soon",
      "This service is being prepared and is not available yet.",
      [{ text: "Got it" }],
    );
  }

  return (
    <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>2Go</Text>
            <Text style={styles.brandDivider}>·</Text>
            <Text style={styles.brandPortal}>SERVICES PORTAL</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open activity"
            onPress={onSelectActivity}
            style={styles.headerButton}
          >
            <Text style={styles.headerIcon}>♧</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open account"
            onPress={onSelectAccount}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeRow}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>READY WHEN YOU ARE</Text>
            <Text style={styles.greeting}>
              {greeting()},{"\n"}
              {firstName(user.name)}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Set a pickup location"
            onPress={onSelectRide}
            style={styles.locationChip}
          >
            <Text style={styles.locationPin}>⌖</Text>
            <Text style={styles.locationText}>
              {currentLocation ? "Location on" : "Set pickup"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Find a service"
          onPress={onSelectRide}
          style={styles.search}
        >
          <View style={styles.searchIconWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
          </View>
          <Text style={styles.searchPlaceholder}>
            Where can 2Go take or bring you?
          </Text>
          <View style={styles.micWrap}>
            <Text style={styles.micIcon}>⌁</Text>
          </View>
        </TouchableOpacity>

        {hasActiveTrip && activeTrip && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open your active ride"
            onPress={onSelectRide}
            style={styles.activeTrip}
          >
            <View style={styles.activeTripIcon}>
              <Text style={styles.activeTripGlyph}>↗</Text>
            </View>
            <View style={styles.activeTripCopy}>
              <Text style={styles.activeTripTitle}>{tripStatus(activeTrip.status)}</Text>
              <Text style={styles.activeTripRoute} numberOfLines={1}>
                {activeTrip.pickup.address} → {activeTrip.destination.address}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Urban Hub Services</Text>
          <Text style={styles.availability}>3 AVAILABLE · 2 COMING SOON</Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Book a ride"
          onPress={() => selectService("rides")}
          style={styles.featureCard}
        >
          <View style={styles.featureTop}>
            <View style={styles.featureTag}>
              <Text style={styles.featureTagText}>● AVAILABLE NOW</Text>
            </View>
            <View style={styles.featureIcon}>
              <Text style={styles.featureGlyph}>▰</Text>
            </View>
          </View>
          <Text style={styles.featureTitle}>Book a Ride</Text>
          <Text style={styles.featureDescription}>
            Get where you need to go with on-demand rides and live trip updates.
          </Text>
          <View style={styles.featureFooter}>
            <Text style={styles.featureMeta}>FARE ESTIMATES · LIVE TRACKING</Text>
            <Text style={styles.actionText}>Request now  →</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.serviceGrid}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.key}
              accessibilityRole="button"
              accessibilityLabel={`${service.title}, ${service.label.toLowerCase()}`}
              onPress={() => selectService(service.key)}
              style={styles.serviceCard}
            >
              <View style={styles.serviceCardTop}>
                <View style={styles.serviceIcon}>
                  <Text style={styles.serviceGlyph}>{service.icon}</Text>
                </View>
                <Text style={[styles.comingSoon, service.key === "rentals" && styles.availableLabel]}>{service.label}</Text>
              </View>
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceDescription} numberOfLines={2}>
                {service.description}
              </Text>
              <View style={styles.serviceFooter}>
                <Text style={styles.serviceFooterText}>Explore</Text>
                <Text style={styles.serviceArrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoGlyph}>✳</Text>
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>More ways to go, all in one app</Text>
            <Text style={styles.infoDescription}>
              Book rides, plan a relocation, or find a rental vehicle with 2Go.
            </Text>
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  brand: { flex: 1, flexDirection: "row", alignItems: "center" },
  brandName: { color: palette.text, fontSize: 21, fontWeight: "900" },
  brandDivider: { color: palette.muted, fontSize: 18, marginHorizontal: 6 },
  brandPortal: {
    color: palette.text,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  headerButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerIcon: { color: palette.text, fontSize: 22 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#36545a",
    borderWidth: 1,
    borderColor: "#6f9095",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: palette.text, fontSize: 14, fontWeight: "800" },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  welcomeCopy: { flexShrink: 1 },
  eyebrow: {
    color: palette.cyan,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },
  greeting: {
    color: palette.text,
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 33,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.raised,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
    marginLeft: 8,
    maxWidth: 120,
  },
  locationPin: { color: palette.cyan, fontSize: 18, marginRight: 6 },
  locationText: { color: palette.text, fontSize: 10, fontWeight: "600" },
  search: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1d3b42",
    marginRight: 10,
  },
  searchIcon: { color: palette.cyan, fontSize: 27, lineHeight: 30 },
  searchPlaceholder: { flex: 1, color: palette.muted, fontSize: 13 },
  micWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#11191d",
    alignItems: "center",
    justifyContent: "center",
  },
  micIcon: { color: palette.text, fontSize: 20 },
  activeTrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.panel,
    borderColor: "#245059",
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    marginBottom: 22,
  },
  activeTripIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#173b43",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  activeTripGlyph: { color: palette.cyan, fontSize: 22 },
  activeTripCopy: { flex: 1 },
  activeTripTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
  activeTripRoute: { color: palette.muted, fontSize: 10, marginTop: 4 },
  chevron: { color: palette.cyan, fontSize: 25, paddingLeft: 8 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { color: palette.text, fontSize: 17, fontWeight: "800" },
  availability: { color: palette.cyan, fontSize: 8, fontWeight: "900" },
  featureCard: {
    borderRadius: 20,
    backgroundColor: "#1a2a30",
    borderWidth: 1,
    borderColor: "#26383d",
    padding: 18,
    marginBottom: 14,
  },
  featureTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  featureTag: {
    backgroundColor: "#133a3f",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featureTagText: {
    color: palette.mint,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: palette.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  featureGlyph: { color: "#071418", fontSize: 25, fontWeight: "900" },
  featureTitle: { color: palette.text, fontSize: 21, fontWeight: "800" },
  featureDescription: {
    color: "#c0cbd0",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 280,
  },
  featureFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 19,
    flexWrap: "wrap",
    gap: 8,
  },
  featureMeta: {
    color: palette.muted,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  actionText: { color: palette.cyan, fontSize: 12, fontWeight: "800" },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  serviceCard: {
    width: "47%",
    minHeight: 174,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: "#202a2f",
    borderRadius: 18,
    padding: 14,
  },
  serviceCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 4,
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#303b41",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceGlyph: { color: palette.cyan, fontSize: 21, fontWeight: "700" },
  comingSoon: {
    color: palette.muted,
    backgroundColor: "#303a40",
    borderRadius: 10,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 7,
    fontWeight: "900",
  },
  availableLabel: { color: palette.background, backgroundColor: palette.cyan },
  serviceTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
  serviceDescription: {
    color: "#c0cbd0",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
    minHeight: 30,
  },
  serviceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 10,
  },
  serviceFooterText: { color: palette.muted, fontSize: 9 },
  serviceArrow: { color: palette.muted, fontSize: 18 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2a30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#26383d",
    padding: 16,
    marginTop: 16,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#173b43",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoGlyph: { color: palette.cyan, fontSize: 23 },
  infoCopy: { flex: 1 },
  infoTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
  infoDescription: {
    color: palette.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
});
