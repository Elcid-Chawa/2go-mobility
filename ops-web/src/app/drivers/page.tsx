"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, UserPlus, UserCheck } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { Permission } from "../../lib/types";
import { PermissionGate } from "../../components/PermissionGate";

interface DriverRecord {
  _id: string;
  userId?: { _id?: string; name?: string; email?: string; phone?: string; status?: string };
  licenseNumber?: string;
  approvalStatus: string;
  onlineStatus: string;
  availabilityStatus: string;
  rating: number;
  totalTrips: number;
  activeVehicleId?: { make?: string; model?: string; registrationNumber?: string; category?: string; status?: string };
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      setDrivers(await apiRequest<DriverRecord[]>("/admin/drivers"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load drivers.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  return (
    <PermissionGate permission={Permission.VIEW_OPERATIONS}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Driver management</h1>
            <p className="mt-1 text-sm text-slate-400">Driver status and assigned vehicle data from the backend.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/users" className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950"><UserPlus className="h-4 w-4" />Add driver</Link>
            <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200"><UserCheck className="h-4 w-4" />Review applications</Link>
            <button onClick={() => void load()} aria-label="Refresh drivers" className="rounded-lg border border-slate-700 p-2 text-slate-200"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </header>
        {error && <p role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          {loading ? <p className="p-4 text-sm text-slate-400">Loading drivers…</p> : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase text-slate-500"><tr><th className="p-3">Driver</th><th className="p-3">Approval</th><th className="p-3">Availability</th><th className="p-3">Vehicle</th><th className="p-3">Trips / rating</th></tr></thead>
              <tbody>{drivers.map((driver) => <tr key={driver._id} className="border-t border-slate-800">
                <td className="p-3"><div className="font-medium text-white">{driver.userId?.name || "Driver"}</div><div className="text-xs text-slate-400">{driver.userId?.email} · {driver.userId?.phone}</div><div className="mt-1 font-mono text-[10px] text-slate-500">{driver._id}</div></td>
                <td className="p-3"><span className={driver.approvalStatus === "APPROVED" ? "text-emerald-300" : driver.approvalStatus === "REJECTED" ? "text-rose-300" : "text-amber-300"}>{driver.approvalStatus}</span></td>
                <td className="p-3 text-slate-300">{driver.onlineStatus} · {driver.availabilityStatus}</td>
                <td className="p-3 text-slate-300">{driver.activeVehicleId ? `${driver.activeVehicleId.make} ${driver.activeVehicleId.model} · ${driver.activeVehicleId.registrationNumber}` : "No active vehicle"}</td>
                <td className="p-3 text-slate-300">{driver.totalTrips} · {driver.rating?.toFixed(1) || "—"}</td>
              </tr>)}</tbody>
            </table>
          )}
          {!loading && !drivers.length && <p className="p-4 text-sm text-slate-400">No drivers have registered.</p>}
        </div>
      </div>
    </PermissionGate>
  );
}
