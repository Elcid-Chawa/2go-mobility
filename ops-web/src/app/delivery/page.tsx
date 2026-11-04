"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { PermissionGate } from "../../components/PermissionGate";
import { deliveryRequest } from "../../lib/api";
import { Permission } from "../../lib/types";

type DeliveryStatus = "REQUESTED" | "ASSIGNED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
type DeliveryOrder = {
  _id: string;
  customerName: string;
  customerPhone: string;
  recipientName: string;
  recipientPhone: string;
  pickupAddress: string;
  destinationAddress: string;
  packageType: string;
  packageDescription: string;
  weightKg: number;
  fragile: boolean;
  notes: string;
  estimatedDistanceKm: number;
  estimatedFare: number;
  currency: string;
  status: DeliveryStatus;
  driverId?: string;
  driverProfileId?: string;
  driverName?: string;
  driverPhone?: string;
  driverLocation?: { coordinates: [number, number]; updatedAt: string };
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  paymentMethod?: "CASH" | "MOBILE_MONEY";
  rating?: { score: number; comment: string };
  createdAt: string;
  statusHistory: Array<{ status: string; note: string; actorRole: string; createdAt: string }>;
};
type Driver = {
  _id?: string;
  userId?: { _id?: string; name?: string; phone?: string; status?: string };
  approvalStatus?: string;
  onlineStatus?: string;
  availabilityStatus?: string;
  activeVehicleId?: { status?: string; make?: string; model?: string; registrationNumber?: string };
};
type Pricing = { baseFee: number; perKmRate: number; perKgRate: number; roadFactor: number; currency: string };
type Summary = { total: number; active: number; delivered: number; unpaid: number; revenue: Array<{ _id: string; amount: number }> };

const emptyPricing: Pricing = { baseFee: 1000, perKmRate: 300, perKgRate: 100, roadFactor: 1.25, currency: "RWF" };
const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400";
const labelClass = "block text-xs font-bold text-slate-400";
const buttonClass = "rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50";

function DeliveryOperationsPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pricing, setPricing] = useState<Pricing>(emptyPricing);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [nextOrders, nextDrivers, nextPricing, nextSummary] = await Promise.all([
        deliveryRequest<DeliveryOrder[]>("/admin/orders"),
        deliveryRequest<Driver[]>("/admin/drivers"),
        deliveryRequest<Pricing>("/admin/pricing"),
        deliveryRequest<Summary>("/admin/summary"),
      ]);
      setOrders(nextOrders);
      setDrivers(nextDrivers);
      setPricing(nextPricing);
      setSummary(nextSummary);
      setSelectedDrivers((current) => {
        const updated = { ...current };
        for (const order of nextOrders) {
          if (!updated[order._id] && order.driverId) updated[order._id] = order.driverId;
        }
        return updated;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load Delivery operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const timer = setInterval(() => void loadData(), 20000);
    return () => clearInterval(timer);
  }, [loadData]);

  async function mutate(orderId: string, path: string, body: Record<string, unknown>, method: "PATCH" = "PATCH") {
    setBusy(orderId);
    setError("");
    setNotice("");
    try {
      await deliveryRequest(path, { method, body: JSON.stringify(body) });
      setNotice("Delivery record updated.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The delivery update could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function savePricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("pricing");
    setError("");
    setNotice("");
    try {
      const updated = await deliveryRequest<Pricing>("/admin/pricing", {
        method: "PATCH",
        body: JSON.stringify({
          baseFee: Number(pricing.baseFee),
          perKmRate: Number(pricing.perKmRate),
          perKgRate: Number(pricing.perKgRate),
          roadFactor: Number(pricing.roadFactor),
          currency: pricing.currency,
        }),
      });
      setPricing(updated);
      setNotice("Delivery pricing saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save delivery pricing.");
    } finally {
      setBusy("");
    }
  }

  const availableDrivers = drivers.filter((driver) =>
    driver.userId?._id &&
    driver.approvalStatus === "APPROVED" &&
    driver.userId.status === "ACTIVE" &&
    driver.onlineStatus === "ONLINE" &&
    driver.availabilityStatus === "AVAILABLE" &&
    driver.activeVehicleId?.status === "ACTIVE",
  );

  return (
    <PermissionGate permission={Permission.DELIVERY_MANAGE}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Last-mile courier service</p>
            <h1 className="mt-1 text-2xl font-black text-white">Delivery operations</h1>
            <p className="mt-1 text-sm text-slate-400">Dispatch parcel requests, follow courier updates, and confirm payment.</p>
          </div>
          <button onClick={() => void loadData()} className={buttonClass}>Refresh</button>
        </header>

        {error && <p role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p>}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["All requests", summary?.total ?? "—"],
            ["Active deliveries", summary?.active ?? "—"],
            ["Delivered", summary?.delivered ?? "—"],
            ["Awaiting payment", summary?.unpaid ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>

        <form onSubmit={savePricing} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4">
            <h2 className="font-black text-white">Delivery pricing</h2>
            <p className="mt-1 text-xs text-slate-400">Fare = base fee + road-adjusted distance rate + parcel weight rate. The API computes distance from coordinates.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {([
              ["baseFee", "Base fee"],
              ["perKmRate", "Per km"],
              ["perKgRate", "Per kg"],
              ["roadFactor", "Road-distance factor"],
            ] as const).map(([field, label]) => (
              <label key={field} className={labelClass}>{label}
                <input required type="number" min={field === "roadFactor" ? "1" : "0"} step={field === "roadFactor" ? "0.05" : "1"} value={pricing[field]} onChange={(event) => setPricing((current) => ({ ...current, [field]: Number(event.target.value) }))} className={`${inputClass} mt-2`} />
              </label>
            ))}
            <label className={labelClass}>Currency
              <input required maxLength={3} value={pricing.currency} onChange={(event) => setPricing((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className={`${inputClass} mt-2`} />
            </label>
          </div>
          <button disabled={busy === "pricing"} className={`${buttonClass} mt-4`}>{busy === "pricing" ? "Saving…" : "Save tariff"}</button>
        </form>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-black text-white">Parcel requests</h2>
            <p className="text-xs text-slate-500">{availableDrivers.length} approved, online, available courier(s)</p>
          </div>
          {loading ? <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">Loading delivery requests…</p> : orders.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">No delivery requests have been placed.</p>
          ) : orders.map((order) => {
            const canAssign = order.status === "REQUESTED" || order.status === "ASSIGNED";
            const canCancel = !["DELIVERED", "CANCELLED"].includes(order.status);
            return (
              <article key={order._id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${order.status === "DELIVERED" ? "border-emerald-800 bg-emerald-950/50 text-emerald-300" : order.status === "CANCELLED" ? "border-rose-800 bg-rose-950/40 text-rose-300" : "border-cyan-900 bg-cyan-950/40 text-cyan-200"}`}>{order.status.replaceAll("_", " ")}</span>
                    <p className="mt-2 text-sm font-bold text-white">{order.pickupAddress} <span className="text-cyan-300">→</span> {order.destinationAddress}</p>
                    <p className="mt-1 text-xs text-slate-400">{order.customerName} ({order.customerPhone}) · recipient {order.recipientName} ({order.recipientPhone})</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-white">{order.currency} {order.estimatedFare.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.estimatedDistanceKm.toFixed(1)} km · {order.weightKg} kg</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <p>{order.packageType}: {order.packageDescription}{order.fragile ? " · Fragile" : ""}</p>
                  <p>Courier: {order.driverName || "Not assigned"}</p>
                  {order.driverLocation && <p>Last location: {order.driverLocation.coordinates[1].toFixed(5)}, {order.driverLocation.coordinates[0].toFixed(5)} · {new Date(order.driverLocation.updatedAt).toLocaleTimeString()}</p>}
                  {order.notes && <p>Instructions: {order.notes}</p>}
                  <p>Payment: {order.paymentStatus}{order.paymentMethod ? ` · ${order.paymentMethod}` : ""}{order.rating ? ` · ${order.rating.score}/5 rating` : ""}</p>
                </div>
                {canAssign && (
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <label className={`${labelClass} min-w-64 flex-1`}>Assign courier
                      <select value={selectedDrivers[order._id] || ""} onChange={(event) => setSelectedDrivers((current) => ({ ...current, [order._id]: event.target.value }))} className={`${inputClass} mt-2`}>
                        <option value="">Select available driver</option>
                        {availableDrivers.map((driver) => <option key={driver.userId!._id} value={driver.userId!._id}>{driver.userId?.name || "Courier"} · {driver.activeVehicleId?.make} {driver.activeVehicleId?.model}</option>)}
                      </select>
                    </label>
                    <button disabled={busy === order._id || !selectedDrivers[order._id]} onClick={() => void mutate(order._id, `/admin/orders/${order._id}/assign`, { driverId: selectedDrivers[order._id] })} className={buttonClass}>{busy === order._id ? "Assigning…" : "Assign driver"}</button>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {canCancel && <button disabled={busy === order._id} onClick={() => void mutate(order._id, `/admin/orders/${order._id}/status`, { status: "CANCELLED", note: "Cancelled by Operations" })} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300">Cancel delivery</button>}
                  {!canCancel && order.driverProfileId && <button disabled={busy === order._id} onClick={() => void mutate(order._id, `/admin/orders/${order._id}/release-driver`, {})} className="rounded-lg border border-amber-900 px-3 py-2 text-xs font-bold text-amber-200">Retry driver release</button>}
                  {order.status === "DELIVERED" && order.paymentStatus !== "PAID" && (
                    <>
                      <select id={`payment-${order._id}`} defaultValue="CASH" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white">
                        <option value="CASH">Cash</option><option value="MOBILE_MONEY">Mobile money</option>
                      </select>
                      <button disabled={busy === order._id} onClick={() => {
                        const paymentMethod = (document.getElementById(`payment-${order._id}`) as HTMLSelectElement | null)?.value || "CASH";
                        void mutate(order._id, `/admin/orders/${order._id}/payment`, { paymentStatus: "PAID", paymentMethod });
                      }} className={buttonClass}>Confirm payment</button>
                      <button disabled={busy === order._id} onClick={() => void mutate(order._id, `/admin/orders/${order._id}/payment`, { paymentStatus: "FAILED", paymentMethod: "CASH" })} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300">Mark failed</button>
                    </>
                  )}
                </div>
                {order.statusHistory?.length > 0 && <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer">Status history</summary>
                  <ul className="mt-2 space-y-1">{order.statusHistory.map((event, index) => <li key={`${event.status}-${index}`}>{new Date(event.createdAt).toLocaleString()} · {event.status.replaceAll("_", " ")} · {event.actorRole}{event.note ? ` · ${event.note}` : ""}</li>)}</ul>
                </details>}
              </article>
            );
          })}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-black text-white">Recorded revenue</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {(summary?.revenue || []).map((item) => <span key={item._id} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-emerald-300">{item._id} {item.amount.toLocaleString()}</span>)}
            {!summary?.revenue.length && <span className="text-xs text-slate-500">No confirmed delivery payments yet.</span>}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}

export default DeliveryOperationsPage;
