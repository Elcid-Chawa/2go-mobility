import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { register, login, AuthUser } from "../api";

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<"CUSTOMER" | "DRIVER">("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const user = isRegistering
        ? await register({ name, email, phone, password, role })
        : await login(email, password);
      onAuthenticated(user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Authentication failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0e1519" }}><StatusBar barStyle="light-content"/><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>2</Text>
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.logo}>2Go</Text>
          <Text style={styles.brandLine}>Precision Urban Mobility</Text>
        </View>
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>FASTPATH</Text>
        </View>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>⚡ INSTANT DISPATCH SYSTEM</Text>
        <Text style={styles.heroTitle}>Where to next?</Text>
        <Text style={styles.heroCopy}>
          Tap into lightning-fast urban pickups across 180+ transit zones.
        </Text>
      </View>
      <View style={[styles.roleRow, {backgroundColor: "#1c2429", padding: 6, borderRadius: 14, marginBottom: 24}]}>
        <RoleButton label="Rider" active={role === "CUSTOMER"} onPress={() => setRole("CUSTOMER")} />
        <RoleButton label="Driver Partner" active={role === "DRIVER"} onPress={() => setRole("DRIVER")} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.kicker}>
          {isRegistering ? "CREATE YOUR ACCOUNT" : "WELCOME BACK"}
        </Text>
        <Text style={styles.title}>
          {isRegistering ? "Start moving" : "Sign in to 2GO"}
        </Text>
        <Text style={styles.subtitle}>
          {isRegistering
            ? "Choose how you will use 2GO."
            : role === "DRIVER" ? "Sign in to your driver account." : "Your next ride starts here."}
        </Text>
        {isRegistering && (
          <>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor="#718198"
              accessibilityLabel="Full name" autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor="#718198"
              accessibilityLabel="Phone number" keyboardType="phone-pad"
            />
          </>
        )}
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          placeholderTextColor="#718198"
          autoCapitalize="none"
          accessibilityLabel="Email address" keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#718198"
          accessibilityLabel="Password" secureTextEntry
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.secureLine}>
          <Text style={styles.secureText}>♢ Secure account sign-in</Text>

        </View>
        <TouchableOpacity
          style={styles.submit}
          onPress={submit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading
              ? "PLEASE WAIT..."
              : isRegistering
                ? "Create account"
                : "Continue with Email"}
          </Text>
          {loading && <ActivityIndicator color="#fff" />}
        </TouchableOpacity>
        <View style={styles.socialDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.socialDividerText}>social login coming later</Text>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.socialRow}>
          {[["A", "Apple"], ["G", "Google"], ["f", "Facebook"]].map(([icon, label]) => (
            <TouchableOpacity
              key={label}
              accessibilityLabel={`${label} sign in coming soon`}
              accessibilityState={{ disabled: true }}
              disabled
              style={styles.socialButton}
            >
              <Text style={styles.socialIcon}>{icon}</Text>
              <Text style={styles.socialLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.switch}
          onPress={() => {
            setIsRegistering(!isRegistering);
            setError("");
          }}
        >
          <Text style={styles.switchText}>
            {isRegistering
              ? "Already have an account? Sign in"
              : "New to 2GO? Create an account"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.legal}>
          By signing up or logging in, you agree to the 2Go Terms of Service and
          acknowledge our Privacy Policy.
        </Text>
      </View>
    </ScrollView></KeyboardAvoidingView></SafeAreaView>);
}

function RoleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.roleButton, active && styles.roleButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.roleText, active && styles.roleTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: "#0b1015",
    padding: 16,
    justifyContent: "flex-start",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 22,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#00d4ed",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: { color: "#071015", fontSize: 25, fontWeight: "900" },
  brandCopy: { marginLeft: 9 },
  logo: { color: "#e9f2f5", fontSize: 19, fontWeight: "800" },
  brandLine: {
    color: "#92a1a9",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 4,
  },
  onlinePill: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#182229",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#39e6b0",
    marginRight: 6,
  },
  onlineText: { color: "#bdc9cd", fontSize: 10, fontWeight: "700" },
  hero: {
    backgroundColor: "#161c21",
    borderRadius: 13,
    padding: 16,
    marginBottom: 23,
    borderWidth: 1,
    borderColor: "#1f2a30",
  },
  heroKicker: {
    color: "#b9e9ed",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: "#eaf2f4",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
  },
  heroCopy: {
    color: "#9ba8ae",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 280,
  },
  panel: {
    backgroundColor: "#161c21",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#1f2a30",
    padding: 16,
  },
  kicker: {
    color: "#39e6b0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: { color: "#eaf2f4", fontSize: 25, fontWeight: "900", marginTop: 8 },
  subtitle: {
    color: "#9ba8ae",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 20,
  },
  roleRow: { flexDirection: "row", gap: 9, marginBottom: 11 },
  roleButton: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2b363c",
  },
  roleButtonActive: { backgroundColor: "#343b40", borderColor: "#343b40" },
  roleText: { color: "#aab6bb", fontWeight: "800", fontSize: 12 },
  roleTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#252b30",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#2e383e",
    color: "#f0f6f7",
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 10,
    fontSize: 14,
  },
  error: { color: "#ff7b86", fontSize: 12, lineHeight: 17, marginBottom: 8 },
  secureLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 13,
  },
  secureText: { color: "#a5b3b8", fontSize: 10 },
  demoText: { color: "#d5e6e8", fontSize: 10, textDecorationLine: "underline" },
  submit: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: "#00d4ed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 5,
  },
  submitText: {
    color: "#071015",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  switch: { alignItems: "center", marginTop: 18 },
  switchText: { color: "#a9b9be", fontSize: 12, fontWeight: "700" },
  socialDivider: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#303a40" },
  socialDividerText: { color: "#66757c", fontSize: 10 },
  socialRow: { flexDirection: "row", gap: 9, marginTop: 14 },
  socialButton: { flex: 1, minHeight: 62, borderRadius: 12, backgroundColor: "#242b30", opacity: 0.42, alignItems: "center", justifyContent: "center", gap: 4 },
  socialIcon: { color: "#a9b9be", fontSize: 18, fontWeight: "900" },
  socialLabel: { color: "#a9b9be", fontSize: 10 },
  legal: {
    color: "#839198",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 18,
  },
});
