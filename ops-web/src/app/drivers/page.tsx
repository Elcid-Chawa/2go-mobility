"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Car,
  Star,
  CheckCircle,
  Shield,
  Phone,
  Mail,
  UserCheck,
  ArrowRight,
} from "lucide-react";

export default function DriversPage() {
  const [drivers] = useState([
    {
      id: "DRV-1029",
      name: "Bob Chauffeur",
      phone: "+250788000333",
      email: "bob.driver@2go.rw",
      license: "DL-RW-102938",
      vehicle: "2023 Toyota Camry Hybrid (RAD 892 B)",
      category: "STANDARD",
      onlineStatus: "ONLINE",
      availability: "AVAILABLE",
      rating: 4.95,
      totalTrips: 143,
      totalEarnings: "428,000 RWF",
    },
    {
      id: "DRV-1030",
      name: "Jean Paul Habimana",
      phone: "+250788334455",
      email: "jeanpaul.h@2go.rw",
      license: "DL-RW-110293",
      vehicle: "2021 Volkswagen Passat (RAC 102 M)",
      category: "PREMIUM",
      onlineStatus: "ONLINE",
      availability: "AVAILABLE",
      rating: 5.0,
      totalTrips: 68,
      totalEarnings: "215,400 RWF",
    },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Quick Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Driver & Fleet Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Active verified drivers, vehicle telematics, and operational
            availability status.
          </p>
        </div>

        <Link
          href="/onboarding"
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg flex items-center gap-2 self-start md:self-auto"
        >
          <UserCheck className="w-4 h-4" />
          <span>Driver Onboarding Queue (2 Pending)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid of Verified Active Drivers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <div
            key={driver.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-lg">
                  {driver.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {driver.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {driver.id} • {driver.license}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {driver.onlineStatus}
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Assigned Vehicle:</span>
                <span className="font-medium text-slate-200">
                  {driver.vehicle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-emerald-400">
                  {driver.category}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Availability:</span>
                <span className="font-medium text-cyan-400">
                  {driver.availability}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                <div className="font-bold text-amber-400">
                  ⭐ {driver.rating}
                </div>
                <div className="text-[10px] text-slate-500">Rating</div>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                <div className="font-bold text-slate-200">
                  {driver.totalTrips}
                </div>
                <div className="text-[10px] text-slate-500">Trips</div>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                <div className="font-bold text-emerald-400">
                  {driver.totalEarnings}
                </div>
                <div className="text-[10px] text-slate-500">Earnings</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
