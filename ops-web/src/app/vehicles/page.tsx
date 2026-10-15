"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { Permission } from "../../lib/types";
import { PermissionGate } from "../../components/PermissionGate";

type Category = "STANDARD" | "COMFORT" | "PREMIUM" | "XL";
type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
interface VehicleRecord {
  _id: string;
  driverId?: { _id?: string; userId?: { name?: string; phone?: string } };
  registrationNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  category: Category;
  status: VehicleStatus;
}

const initialForm = {
  driverId: "",
  registrationNumber: "",
  vin: "",
  make: "",
  model: "",
  year: String(new Date().getFullYear()),
  color: "",
  category: "STANDARD" as Category,
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setError("");
    try {
      setVehicles(await apiRequest<VehicleRecord[]>("/admin/vehicles"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load vehicles.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void reload(); }, []);

  async function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const created = await apiRequest<VehicleRecord>("/admin/vehicles", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          year: Number(form.year),
          ...(form.driverId.trim() ? { driverId: form.driverId.trim() } : {}),
        }),
      });
      setVehicles((current) => [created, ...current]);
      setNotice("Vehicle added to the fleet.");
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add this vehicle.");
    }
  }

  async function updateStatus(vehicle: VehicleRecord, status: VehicleStatus) {
    setError("");
    try {
      const updated = await apiRequest<VehicleRecord>(`/admin/vehicles/${vehicle._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setVehicles((current) => current.map((item) => item._id === updated._id ? updated : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update vehicle status.");
    }
  }

  return (
    <PermissionGate permission={Permission.FLEET_MANAGE}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header><h1 className="text-2xl font-bold text-white">Vehicle management</h1><p className="mt-1 text-sm text-slate-400">Register fleet vehicles, link a driver profile, and set operational availability.</p></header>
        {error && <p role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p>}

        <form onSubmit={createVehicle} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <h2 className="sm:col-span-2 xl:col-span-4 text-lg font-semibold text-white">Add a vehicle</h2>
          <Input label="Registration / plate" value={form.registrationNumber} onChange={(value) => setForm({ ...form, registrationNumber: value })} required />
          <Input label="VIN / chassis number" value={form.vin} onChange={(value) => setForm({ ...form, vin: value })} required />
          <Input label="Make" value={form.make} onChange={(value) => setForm({ ...form, make: value })} required />
          <Input label="Model" value={form.model} onChange={(value) => setForm({ ...form, model: value })} required />
          <Input label="Year" type="number" value={form.year} onChange={(value) => setForm({ ...form, year: value })} required />
          <Input label="Color" value={form.color} onChange={(value) => setForm({ ...form, color: value })} required />
          <Input label="Driver profile ID (optional)" value={form.driverId} onChange={(value) => setForm({ ...form, driverId: value })} />
          <label className="text-xs font-semibold text-slate-300">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Category })} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white">{(["STANDARD", "COMFORT", "PREMIUM", "XL"] as Category[]).map((category) => <option key={category}>{category}</option>)}</select></label>
          <button className="self-end rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950">Add vehicle</button>
        </form>

        <section className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4 font-semibold text-white">Fleet</div>
          {loading ? <p className="p-4 text-sm text-slate-400">Loading fleet…</p> : <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-500"><tr><th className="p-3">Vehicle</th><th className="p-3">VIN</th><th className="p-3">Driver</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Change status</th></tr></thead>
            <tbody>{vehicles.map((vehicle) => <tr key={vehicle._id} className="border-t border-slate-800">
              <td className="p-3 text-white">{vehicle.year} {vehicle.make} {vehicle.model}<div className="text-xs text-slate-400">{vehicle.registrationNumber} · {vehicle.color}</div></td>
              <td className="p-3 font-mono text-xs text-slate-300">{vehicle.vin}</td>
              <td className="p-3 text-slate-300">{vehicle.driverId?.userId?.name || "Unassigned"}</td>
              <td className="p-3 text-slate-300">{vehicle.category}</td>
              <td className="p-3 text-slate-300">{vehicle.status}</td>
              <td className="p-3"><select aria-label={`Set ${vehicle.registrationNumber} status`} value={vehicle.status} onChange={(event) => void updateStatus(vehicle, event.target.value as VehicleStatus)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white">{(["ACTIVE", "MAINTENANCE", "INACTIVE"] as VehicleStatus[]).map((status) => <option key={status}>{status}</option>)}</select></td>
            </tr>)}</tbody>
          </table>}
          {!loading && !vehicles.length && <p className="p-4 text-sm text-slate-400">No vehicles registered.</p>}
        </section>
      </div>
    </PermissionGate>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return <label className="text-xs font-semibold text-slate-300">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" /></label>;
}
