"use client";

import React, { useEffect, useState } from "react";
import { Activity, Car, CircleDollarSign, Navigation2, Users } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { Permission } from "../../lib/types";
import { PermissionGate } from "../../components/PermissionGate";

interface Dashboard {
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  onlineDrivers: number;
  totalDrivers: number;
  totalCustomers: number;
  totalVehicles: number;
  totalRevenue: number;
  currency: string;
}

const metrics: Array<{ key: keyof Dashboard; title: string; icon: React.ElementType; format?: (value: number, data: Dashboard) => string }> = [
  { key: "activeTrips", title: "Active trips", icon: Navigation2 },
  { key: "onlineDrivers", title: "Drivers online", icon: Car },
  { key: "totalCustomers", title: "Customers", icon: Users },
  { key: "totalVehicles", title: "Vehicles", icon: Activity },
  { key: "completedTrips", title: "Completed trips", icon: Navigation2 },
  { key: "totalRevenue", title: "Recorded revenue", icon: CircleDollarSign, format: (value, data) => `${value.toLocaleString()} ${data.currency}` },
];

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Dashboard>("/admin/dashboard")
      .then(setData)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard."));
  }, []);

  return (
    <PermissionGate permission={Permission.VIEW_OPERATIONS}>
      <main className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">Operations dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Live counts from the authoritative 2GO backend.</p>
        </header>
        {error && <p role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        {!data && !error && <p className="text-sm text-slate-400">Loading operations data…</p>}
        {data && <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map(({ key, title, icon: Icon, format }) => (
              <section key={key} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  {title}<Icon className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="mt-3 text-2xl font-bold text-white">
                  {format ? format(Number(data[key]), data) : Number(data[key]).toLocaleString()}
                </div>
              </section>
            ))}
          </div>
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold text-white">Fleet summary</h2>
            <p className="mt-2 text-sm text-slate-400">{data.totalDrivers} driver profiles · {data.onlineDrivers} currently online · {data.totalTrips} total trips.</p>
          </section>
        </>}
      </main>
    </PermissionGate>
  );
}
