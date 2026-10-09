"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRole, Permission, ROLE_PERMISSIONS } from "../lib/types";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser;
  role: UserRole;
  setRole: (role: UserRole) => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const DEFAULT_USERS: Record<UserRole, AuthUser> = {
  [UserRole.ADMIN]: {
    id: "USR-ADMIN-01",
    name: "Sarah Executive",
    email: "sarah.admin@2go.rw",
    role: UserRole.ADMIN,
  },
  [UserRole.OPERATIONS]: {
    id: "USR-OPS-01",
    name: "Jean-Luc Operations",
    email: "jeanluc.ops@2go.rw",
    role: UserRole.OPERATIONS,
  },
  [UserRole.DISPATCHER]: {
    id: "USR-DISPATCH-01",
    name: "Claudine Dispatch",
    email: "claudine.dispatch@2go.rw",
    role: UserRole.DISPATCHER,
  },
  [UserRole.VIEWER]: {
    id: "USR-AUDIT-01",
    name: "David Auditor",
    email: "david.auditor@2go.rw",
    role: UserRole.VIEWER,
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>(UserRole.OPERATIONS);
  const [user, setUser] = useState<AuthUser>(
    DEFAULT_USERS[UserRole.OPERATIONS],
  );

  useEffect(() => {
    // Check if a saved role exists in localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("2go_ops_role") as UserRole;
      if (saved && Object.values(UserRole).includes(saved)) {
        setRoleState(saved);
        setUser(DEFAULT_USERS[saved]);
      }
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    setUser(DEFAULT_USERS[newRole]);
    if (typeof window !== "undefined") {
      localStorage.setItem("2go_ops_role", newRole);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        setRole,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
