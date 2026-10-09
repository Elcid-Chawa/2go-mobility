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
  Shield,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRole, ROLE_LABELS } from "../lib/types";

export function OpsConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, role, setRole } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const navItems = [
    {
      label: "Dashboard & KPIs",
      href: "/",
      icon: LayoutDashboard,
      color: "text-emerald-400",
    },
    {
      label: "Driver Onboarding",
      href: "/onboarding",
      icon: UserCheck,
      color: "text-teal-400",
      badge: "2 Pending",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    {
      label: "Active & Past Trips",
      href: "/trips",
      icon: Navigation2,
      color: "text-cyan-400",
    },
    {
      label: "Drivers & Fleet",
      href: "/drivers",
      icon: Car,
      color: "text-amber-400",
    },
    {
      label: "Manual Dispatch",
      href: "/dispatch",
      icon: Radio,
      color: "text-indigo-400",
    },
  ];

  const currentRoleConfig =
    ROLE_LABELS[role] || ROLE_LABELS[UserRole.OPERATIONS];

  if (pathname === "/") {
    return <>{children}</>;
  }

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
            {navItems.map((item) => {
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
                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
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

            {/* RBAC Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs transition"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400 font-medium">Role:</span>
                <span className="font-bold text-white">{role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Switch Operational Role (RBAC)
                  </div>
                  {Object.values(UserRole).map((r) => {
                    const rConfig = ROLE_LABELS[r];
                    const isSelected = role === r;
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          setRole(r);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition text-xs flex flex-col ${
                          isSelected
                            ? "bg-slate-800 border border-slate-700 text-white font-semibold"
                            : "hover:bg-slate-800/50 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            {rConfig.label}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] border ${rConfig.color}`}
                          >
                            {r}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          {rConfig.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
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
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
