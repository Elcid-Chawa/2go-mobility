"use client";

import React from "react";
import { useAuth } from "../context/AuthContext";
import { Permission, UserRole } from "../lib/types";
import { ShieldAlert, Lock } from "lucide-react";

interface PermissionGateProps {
  permission?: Permission;
  roles?: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showRestrictedBanner?: boolean;
}

export function PermissionGate({
  permission,
  roles,
  children,
  fallback,
  showRestrictedBanner = false,
}: PermissionGateProps) {
  const { hasPermission, hasRole } = useAuth();

  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (roles && !hasRole(...roles)) {
    hasAccess = false;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showRestrictedBanner) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
        <div>
          <span className="font-semibold">Access Restricted:</span> Your active
          operational role does not have permission to perform this action.
          Ask an administrator to grant the required operational permission.
        </div>
      </div>
    );
  }

  return null;
}

export function ProtectedButton({
  permission,
  roles,
  children,
  onClick,
  className = "",
  disabled = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  permission?: Permission;
  roles?: UserRole[];
}) {
  const { hasPermission, hasRole } = useAuth();

  let allowed = true;
  if (permission && !hasPermission(permission)) allowed = false;
  if (roles && !hasRole(...roles)) allowed = false;

  if (!allowed) {
    return (
      <button
        disabled
        title="Permission required: Operations or Administrator role"
        className={`${className} opacity-50 cursor-not-allowed filter grayscale relative group`}
        {...props}
      >
        <span className="flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          {children}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}
