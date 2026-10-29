"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { UserRole, Permission, ROLE_PERMISSIONS } from "../lib/types";
import { apiRequest, clearSession, loginRequest } from "../lib/api";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

interface MeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

function toOperationsUser(user: MeResponse["user"]): AuthUser {
  if (user.status !== "ACTIVE") {
    throw new Error("This account is not active.");
  }
  const staffRoles = [
    UserRole.SYSTEM_OWNER,
    UserRole.ADMIN,
    UserRole.OPERATIONS,
    UserRole.AGENT,
    UserRole.DISPATCHER,
    UserRole.VIEWER,
    UserRole.RENTAL_PARTNER,
    UserRole.MOVER_PARTNER,
  ];
  if (!staffRoles.includes(user.role as UserRole)) {
    throw new Error("An Operations account is required.");
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiRequest<MeResponse>("/auth/me")
      .then((result) => {
        if (!cancelled) setUser(toOperationsUser(result.user));
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    try {
      setUser(toOperationsUser(result.user));
    } catch (error) {
      await clearSession();
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearSession();
    } finally {
      setUser(null);
    }
  }, []);

  const role = user?.role ?? null;
  const hasPermission = useCallback(
    (permission: Permission) =>
      role ? (ROLE_PERMISSIONS[role] || []).includes(permission) : false,
    [role],
  );
  const hasRole = useCallback(
    (...roles: UserRole[]) => role !== null && roles.includes(role),
    [role],
  );

  const value = useMemo(
    () => ({ user, role, loading, login, logout, hasPermission, hasRole }),
    [user, role, loading, login, logout, hasPermission, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
