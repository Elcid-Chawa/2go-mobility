"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Navigation2,
  Radio,
  UserCheck,
  Users,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Permission, ROLE_LABELS } from "../lib/types";

export function OpsConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role, loading, login, logout, hasPermission } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const navItems = [
    {
      label: "Dashboard & KPIs",
      href: "/dashboard",
      icon: LayoutDashboard,
      color: "text-emerald-400",
      permission: Permission.VIEW_OPERATIONS,
    },
    {
      label: "Driver Onboarding",
      href: "/onboarding",
      icon: UserCheck,
      color: "text-teal-400",
      permission: Permission.DRIVER_VERIFY,
    },
    {
      label: "Active & Past Trips",
      href: "/trips",
      icon: Navigation2,
      color: "text-cyan-400",
      permission: Permission.VIEW_OPERATIONS,
    },
    {
      label: "Drivers & Fleet",
      href: "/drivers",
      icon: Car,
      color: "text-amber-400",
      permission: Permission.VIEW_OPERATIONS,
    },
    {
      label: "Manual Dispatch",
      href: "/dispatch",
      icon: Radio,
      color: "text-indigo-400",
      permission: Permission.DISPATCH_EXECUTE,
    },
    {
      label: "Users",
      href: "/users",
      icon: Users,
      color: "text-violet-400",
      permission: Permission.USER_MANAGE,
    },
    {
      label: "Vehicles",
      href: "/vehicles",
      icon: Car,
      color: "text-orange-400",
      permission: Permission.FLEET_MANAGE,
    },
  ];

  if (pathname === "/") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sm text-slate-400">
        Checking your Operations session...
      </div>
    );
  }

  if (!user || !role) {
    const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSigningIn(true);
      setLoginError("");
      try {
        await login(email, password);
      } catch (error) {
        setLoginError(
          error instanceof Error ? error.message : "Unable to sign in.",
        );
      } finally {
        setIsSigningIn(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-5">
        <form
          onSubmit={submitLogin}
          className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-xl"
        >
          <div className="mb-7">
            <div className="text-2xl font-black text-white">2GO Operations</div>
            <p className="mt-2 text-sm text-slate-400">
              Sign in with your assigned Operations account.
            </p>
          </div>
          <label className="mb-4 block text-xs font-semibold text-slate-300">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500"
            />
          </label>
          {loginError && (
            <p role="alert" className="mt-3 text-sm text-rose-300">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSigningIn}
            className="mt-6 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {isSigningIn ? "Signing in..." : "Sign in"}
          </button>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Identity and permissions are checked by the main 2GO backend.
          </p>
        </form>
      </div>
    );
  }

  const currentRoleConfig = ROLE_LABELS[role];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo & App Title */}
          <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl tracking-wider shadow-md">
              2G
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">
                2GO Operations
              </h1>
              <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Command Active
              </p>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5">
            {navItems
              .filter((item) => hasPermission(item.permission))
              .map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-800 text-white font-semibold shadow-sm"
                      : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
              })}
          </nav>
        </div>

        {/* RBAC Environment Widget */}
        <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300">Active Role</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentRoleConfig.color}`}
            >
              {role}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            {currentRoleConfig.description}
          </p>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span>2GO Authoritative API</span>
            <span className="text-emerald-400 font-mono">v1.0-online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-950">
        {/* Top Command Header */}
        <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/50 backdrop-blur shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-slate-400">
              Operations Control Center
            </div>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 font-mono">
              PROD-KIGALI-01
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Socket Status */}
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Mesh Connected</span>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-xs text-slate-950 shadow-md">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-400">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => void logout()}
              aria-label="Sign out"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
