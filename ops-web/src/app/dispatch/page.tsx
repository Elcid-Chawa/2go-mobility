"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Send, Shield } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { Permission } from "../../lib/types";
import { PermissionGate } from "../../components/PermissionGate";
import { useAuth } from "../../context/AuthContext";

interface DispatchTrip {
  _id: string;
  status: string;
  category: string;
  estimatedFare: number;
  pickup: { address: string };
  destination: { address: string };
}

interface DispatchDriver {
  _id: string;
  approvalStatus: string;
  onlineStatus: string;
  availabilityStatus: string;
  lastLocationUpdate?: string;
  activeVehicleId?: { status: string; category: string; make: string; model: string; registrationNumber: string };
  userId?: { name?: string };
}

export default function ManualDispatchPage() {
  const { role } = useAuth();
  const [trips, setTrips] = useState<DispatchTrip[]>([]);
  const [drivers, setDrivers] = useState<DispatchDriver[]>([]);
  const [tripId, setTripId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  async function reload() {
    setError("");
    try {
      const [tripList, driverList] = await Promise.all([
        apiRequest<DispatchTrip[]>("/admin/trips"),
        apiRequest<DispatchDriver[]>("/admin/drivers"),
      ]);
      const openTrips = tripList.filter((trip) => ["REQUESTED", "SEARCHING_DRIVER"].includes(trip.status));
      setTrips(openTrips);
      setDrivers(driverList);
      setTripId((current) => openTrips.some((trip) => trip._id === current) ? current : openTrips[0]?._id || "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load dispatch options.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const selectedTrip = trips.find((trip) => trip._id === tripId);
  const availableDrivers = useMemo(() => drivers.filter((driver) =>
    driver.approvalStatus === "APPROVED" &&
    driver.onlineStatus === "ONLINE" &&
    driver.availabilityStatus === "AVAILABLE" &&
    driver.activeVehicleId?.status === "ACTIVE" &&
    driver.activeVehicleId.category === selectedTrip?.category &&
    Boolean(driver.lastLocationUpdate && Date.now() - new Date(driver.lastLocationUpdate).getTime() < 120_000),
  ), [drivers, selectedTrip?.category]);

  useEffect(() => {
    setDriverId((current) => availableDrivers.some((driver) => driver._id === current) ? current : availableDrivers[0]?._id || "");
  }, [availableDrivers]);

  async function assignDriver() {
    if (!tripId || !driverId) return;
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/trips/${tripId}/assign`, {
        method: "POST",
        body: JSON.stringify({ driverId }),
      });
      setNotice("Driver assigned. The app has been notified.");
      await reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to assign this driver.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <PermissionGate permission={Permission.DISPATCH_EXECUTE}>
      <main className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-indigo-400" /><h1 className="text-2xl font-bold text-white">Manual dispatch</h1></div>
            <p className="mt-1 text-sm text-slate-400">Assign an approved, online driver with a recent GPS fix and matching active vehicle.</p>
          </div>
          <button onClick={() => void reload()} aria-label="Refresh dispatch data" className="rounded-lg border border-slate-700 p-2 text-slate-200"><RefreshCw className="h-4 w-4" /></button>
        </header>
        {error && <p role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p>}
        {loading ? <p className="text-sm text-slate-400">Loading dispatch data…</p> : (
          <section className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div>
              <label className="text-xs font-semibold text-slate-300">Unassigned trip</label>
              <select value={tripId} onChange={(event) => setTripId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white">
                {trips.map((trip) => <option key={trip._id} value={trip._id}>{trip._id} · {trip.status} · {trip.category} · {trip.pickup.address} → {trip.destination.address} · {Math.round(trip.estimatedFare).toLocaleString()} RWF</option>)}
              </select>
              {!trips.length && <p className="mt-2 text-xs text-slate-500">There are no unassigned trips right now.</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Eligible driver</label>
              <select value={driverId} onChange={(event) => setDriverId(event.target.value)} disabled={!availableDrivers.length} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white">
                {availableDrivers.map((driver) => <option key={driver._id} value={driver._id}>{driver.userId?.name || driver._id} · {driver.activeVehicleId?.make} {driver.activeVehicleId?.model} ({driver.activeVehicleId?.registrationNumber})</option>)}
              </select>
              {!availableDrivers.length && <p className="mt-2 text-xs text-amber-300">No matching driver has an active vehicle, is online and available, and has a location update from the last two minutes.</p>}
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>Role: {role}. The API rechecks driver eligibility and trip state atomically before dispatch.</span>
            </div>
            <button disabled={processing || !tripId || !driverId} onClick={() => void assignDriver()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"><Send className="h-4 w-4" />{processing ? "Assigning…" : "Assign driver"}</button>
          </section>
        )}
      </main>
    </PermissionGate>
  );
}
