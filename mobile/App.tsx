import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CustomerHomeScreen } from "./src/screens/CustomerHomeScreen";
import { DriverHomeScreen } from "./src/screens/DriverHomeScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { AuthUser, logout, restoreSession } from "./src/api";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession().then((session) => {
      setUser(session);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <View style={styles.loading}>
        <Text style={styles.modeLabel}>2GO</Text>
      </View>
    );
  if (!user) return <AuthScreen onAuthenticated={setUser} />;
  if (user.role !== "CUSTOMER" && user.role !== "DRIVER")
    return (
      <View style={styles.loading}>
        <Text style={styles.modeLabel}>MOBILE ACCESS</Text>
        <Text style={styles.accessText}>
          This account is for Operations. Use the Operations console.
        </Text>
        <TouchableOpacity
          style={styles.signOut}
          onPress={() => logout().then(() => setUser(null))}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0e1519" />

      <View style={styles.sessionBar}>
        <Text style={styles.sessionName}>2Go</Text>
        <Text style={styles.sessionRole}>{user.role === "CUSTOMER" ? "RIDER" : "DRIVER PARTNER"}</Text>
        <TouchableOpacity style={{ marginLeft: "auto", padding: 12 }} accessibilityLabel="Sign out" onPress={() => logout().then(() => setUser(null))}>
          <Text style={styles.sessionLogout}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {user.role === "CUSTOMER" ? (
          <CustomerHomeScreen userName={user.name} />
        ) : (
          <DriverHomeScreen userName={user.name} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0e1519",
  },
  sessionBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0e1519",
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#242c31",
  },
  sessionName: {
    paddingLeft: 10,
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sessionRole: {
    color: "#a9b9be",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 3,
  },
  sessionLogout: {
    color: "#a9b9be",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: "auto",
  },
  loading: {
    flex: 1,
    backgroundColor: "#0e1519",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  modeLabel: {
    color: "#00d4ed",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 2,
  },
  accessText: {
    color: "#8796ab",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 21,
  },
  signOut: {
    backgroundColor: "#00d4ed",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 11,
    marginTop: 20,
  },
  signOutText: {
    color: "#fff",
    fontWeight: "900",
  },
  content: {
    flex: 1,
  },
});
