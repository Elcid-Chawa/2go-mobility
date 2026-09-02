import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { register, login, AuthUser, UserRole } from "../api";

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
    <View style={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.logo}>2GO</Text>
        <Text style={styles.brandLine}>MOVE WITH PURPOSE</Text>
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
            : "Your rides, earnings, and trips in one place."}
        </Text>
        {isRegistering && (
          <>
            <View style={styles.roleRow}>
              <RoleButton
                label="Customer"
                active={role === "CUSTOMER"}
                onPress={() => setRole("CUSTOMER")}
              />
              <RoleButton
                label="Driver"
                active={role === "DRIVER"}
                onPress={() => setRole("DRIVER")}
              />
            </View>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor="#718198"
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor="#718198"
              keyboardType="phone-pad"
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
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#718198"
          secureTextEntry
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          style={styles.submit}
          onPress={submit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading
              ? "PLEASE WAIT..."
              : isRegistering
                ? "CREATE ACCOUNT"
                : "SIGN IN"}
          </Text>
          {loading && <ActivityIndicator color="#fff" />}
        </TouchableOpacity>
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
      </View>
    </View>
  );
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
    flex: 1,
    backgroundColor: "#071120",
    padding: 22,
    justifyContent: "center",
  },
  brand: { marginBottom: 34 },
  logo: { color: "#1677ff", fontSize: 42, fontWeight: "900", letterSpacing: 4 },
  brandLine: {
    color: "#718198",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 4,
  },
  panel: {
    backgroundColor: "#101d31",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#21304a",
    padding: 22,
  },
  kicker: {
    color: "#30c979",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  title: { color: "#f7fbff", fontSize: 28, fontWeight: "900", marginTop: 8 },
  subtitle: {
    color: "#8796ab",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 20,
  },
  roleRow: { flexDirection: "row", gap: 9, marginBottom: 11 },
  roleButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2b3c57",
  },
  roleButtonActive: { backgroundColor: "#123b70", borderColor: "#1677ff" },
  roleText: { color: "#8796ab", fontWeight: "800", fontSize: 12 },
  roleTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#0b1729",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#21304a",
    color: "#f7fbff",
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 10,
    fontSize: 14,
  },
  error: { color: "#ff7b86", fontSize: 12, lineHeight: 17, marginBottom: 8 },
  submit: {
    minHeight: 50,
    borderRadius: 11,
    backgroundColor: "#1677ff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 5,
  },
  submitText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  switch: { alignItems: "center", marginTop: 18 },
  switchText: { color: "#8fb8ef", fontSize: 12, fontWeight: "700" },
});
