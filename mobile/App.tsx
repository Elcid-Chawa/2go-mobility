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
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      <View style={styles.sessionBar}>
        <Text style={styles.sessionName}>{user.name}</Text>
        <Text style={styles.sessionRole}>{user.role}</Text>
        <TouchableOpacity onPress={() => logout().then(() => setUser(null))}>
          <Text style={styles.sessionLogout}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {user.role === "CUSTOMER" ? (
          <CustomerHomeScreen />
        ) : (
          <DriverHomeScreen />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  sessionBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101a2d",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 5,
    borderWidth: 1,
    borderColor: "#24324d",
  },
  sessionName: {
    paddingLeft: 10,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sessionRole: {
    color: "#30c979",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 3,
  },
  sessionLogout: {
    color: "#8fb8ef",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: "auto",
  },
  loading: {
    flex: 1,
    backgroundColor: "#071120",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  modeLabel: {
    color: "#1677ff",
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
    backgroundColor: "#1677ff",
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
