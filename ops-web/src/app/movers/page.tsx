"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { moverRequest } from "../../lib/api";
import { Permission } from "../../lib/types";
import { useAuth } from "../../context/AuthContext";

type Section = "AGENCIES" | "VEHICLES" | "REQUESTS" | "MOVES" | "QUOTES";
type Row = Record<string, unknown> & { _id: string; status?: string; reviewNotes?: string };
const vehicleTypes = ["PICKUP", "SMALL_VAN", "MEDIUM_TRUCK", "LARGE_TRUCK", "FLATBED"];
const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-400";
const labelClass = "block text-xs font-bold text-slate-400";
const buttonClass = "rounded-lg bg-orange-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-60";

function show(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (object.name) return String(object.name);
    if (object.make || object.model) return `${object.make || ""} ${object.model || ""}`.trim();
    return JSON.stringify(value);
  }
  return String(value);
}

function relationId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) return String((value as { _id: unknown })._id);
  return "";
}

function statusStyle(status?: string) {
  return status === "APPROVED" || status === "ACTIVE" || status === "COMPLETED" || status === "ACCEPTED" || status === "PAID"
    ? "border-emerald-800 bg-emerald-950/60 text-emerald-300"
    : status === "REJECTED" || status === "SUSPENDED" || status === "CANCELLED" || status === "DECLINED"
      ? "border-rose-900 bg-rose-950/50 text-rose-300"
      : "border-amber-900 bg-amber-950/40 text-amber-200";
}

const emptyAgency = { name: "", registrationNumber: "", email: "", phone: "", address: "", city: "", description: "", ownerUserId: "" };
const emptyVehicle = {
  agencyId: "", make: "", model: "", registrationNumber: "", vehicleType: "MEDIUM_TRUCK",
  capacityKg: "3000", volumeM3: "18", crewCapacity: "4", city: "", description: "",
};

export default function MoversOperationsPage() {
  const { role, hasPermission } = useAuth();
  const isPartner = role === "MOVER_PARTNER";
  const canManage = hasPermission(Permission.MOVER_MANAGE);
  const canReview = hasPermission(Permission.MOVER_REVIEW);
  const [section, setSection] = useState<Section>(isPartner ? "REQUESTS" : "AGENCIES");
  const [rows, setRows] = useState<Record<Section, Row[]>>({ AGENCIES: [], VEHICLES: [], REQUESTS: [], MOVES: [], QUOTES: [] });
  const [agency, setAgency] = useState<Row | null>(null);
  const [agencyForm, setAgencyForm] = useState(emptyAgency);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [quoteForms, setQuoteForms] = useState<Record<string, { vehicleId: string; amount: string; currency: string; crewCount: string; message: string; validUntil: string }>>({});
  const [adminQuoteForms, setAdminQuoteForms] = useState<Record<string, { agencyId: string; vehicleId: string; amount: string; currency: string; crewCount: string; message: string; validUntil: string }>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isPartner) {
        const [myAgency, vehicles, requests, assignments] = await Promise.all([
          moverRequest<Row>("/agency/me"),
          moverRequest<Row[]>("/agency/vehicles"),
          moverRequest<Row[]>("/agency/moves"),
          moverRequest<Row[]>("/agency/assignments"),
        ]);
        setAgency(myAgency);
        setRows({ AGENCIES: [], VEHICLES: vehicles, REQUESTS: requests, MOVES: assignments, QUOTES: [] });
      } else {
        const [agencies, vehicles, moves, quotes] = await Promise.all([
          moverRequest<Row[]>("/admin/agencies"),
          moverRequest<Row[]>("/admin/vehicles"),
          moverRequest<Row[]>("/admin/moves"),
          moverRequest<Row[]>("/admin/quotes"),
        ]);
        setAgency(null);
        setRows({ AGENCIES: agencies, VEHICLES: vehicles, REQUESTS: [], MOVES: moves, QUOTES: quotes });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load moving-service records.");
    } finally {
      setLoading(false);
    }
  }, [isPartner]);

  useEffect(() => {
    if (role) void loadData();
  }, [role, loadData]);

  async function mutate(path: string, method: "POST" | "PATCH", body: Record<string, unknown>, id = "form") {
    setBusy(id);
    setError("");
    try {
      await moverRequest(path, { method, body: JSON.stringify(body) });
      await loadData();
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "The update could not be saved.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function addAgency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await mutate("/admin/agencies", "POST", {
      ...agencyForm,
      ownerUserId: agencyForm.ownerUserId.trim() || undefined,
    });
    if (saved) {
      setAgencyForm(emptyAgency);
      setSection("VEHICLES");
    }
  }

  async function addVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await mutate(isPartner ? "/agency/vehicles" : "/admin/vehicles", "POST", {
      ...vehicleForm,
      agencyId: isPartner ? undefined : vehicleForm.agencyId,
      capacityKg: Number(vehicleForm.capacityKg),
      volumeM3: Number(vehicleForm.volumeM3),
      crewCapacity: Number(vehicleForm.crewCapacity),
    });
    if (saved) setVehicleForm(emptyVehicle);
  }

  async function submitQuote(event: FormEvent<HTMLFormElement>, move: Row) {
    event.preventDefault();
    const form = quoteForms[move._id];
    if (!form) return;
    await mutate(`/agency/moves/${move._id}/quotes`, "POST", {
      ...form,
      amount: Number(form.amount),
      crewCount: Number(form.crewCount),
      validUntil: new Date(form.validUntil).toISOString(),
    }, move._id);
  }

  async function submitAdminQuote(event: FormEvent<HTMLFormElement>, move: Row) {
    event.preventDefault();
    const form = adminQuoteForms[move._id];
    if (!form) return;
    await mutate(`/admin/moves/${move._id}/quotes`, "POST", {
      ...form,
      amount: Number(form.amount),
      crewCount: Number(form.crewCount),
      validUntil: new Date(form.validUntil).toISOString(),
    }, move._id);
  }

  const headings: Record<Section, string> = {
    AGENCIES: "Moving agencies",
    VEHICLES: "Moving fleet",
    REQUESTS: "Open move requests",
    MOVES: isPartner ? "Assigned moves" : "Move requests",
    QUOTES: "Agency quotes",
  };
  const columns: Record<Section, string[]> = {
    AGENCIES: ["name", "city", "managedByPlatform", "registrationNumber", "phone", "email", "status", "reviewNotes"],
    VEHICLES: ["make", "model", "registrationNumber", "vehicleType", "capacityKg", "volumeM3", "crewCapacity", "city", "agencyId", "status"],
    REQUESTS: [],
    MOVES: ["customerName", "customerPhone", "pickupCity", "pickupAddress", "destinationCity", "destinationAddress", "scheduledAt", "moveType", "status", "paymentStatus", "agencyId", "vehicleId"],
    QUOTES: ["moveId", "agencyId", "vehicleId", "amount", "currency", "crewCount", "validUntil", "status"],
  };

  function renderAdminQuoteForm(move: Row) {
    const approvedAgencies = rows.AGENCIES.filter((item) => item.status === "APPROVED");
    const moveVehicles = rows.VEHICLES.filter((vehicle) => {
      const agencyId = relationId(vehicle.agencyId);
      const agencyApproved = approvedAgencies.some((item) => item._id === agencyId);
      const vehicleMatchesType = !move.preferredVehicleType || vehicle.vehicleType === move.preferredVehicleType;
      return agencyApproved && vehicle.status === "ACTIVE" && vehicleMatchesType &&
        Number(vehicle.volumeM3) >= Number(move.estimatedVolumeM3) &&
        Number(vehicle.crewCapacity) >= Number(move.crewRequired);
    });
    const firstVehicle = moveVehicles[0];
    const firstAgencyId = relationId(firstVehicle?.agencyId) || approvedAgencies[0]?._id || "";
    const scheduledAt = new Date(String(move.scheduledAt)).getTime();
    const quoteForm = adminQuoteForms[move._id] || {
      agencyId: firstAgencyId,
      vehicleId: firstVehicle?._id || "",
      amount: "",
      currency: "RWF",
      crewCount: String(move.crewRequired || 2),
      message: "",
      validUntil: new Date(Math.min(Date.now() + 24 * 60 * 60 * 1000, scheduledAt - 60 * 60 * 1000)).toISOString().slice(0, 16),
    };
    const selectedAgencyVehicles = moveVehicles.filter((vehicle) => relationId(vehicle.agencyId) === quoteForm.agencyId);
    return (
      <article key={`ops-${move._id}`} className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-sm font-black text-white">Operations quote · {show(move.pickupCity)} → {show(move.destinationCity)}</h3>
        {approvedAgencies.length === 0 || moveVehicles.length === 0 ? <p className="mt-2 text-xs text-amber-200">Create/approve an agency and an appropriately sized active vehicle before sending a quote.</p> : (
          <form onSubmit={(event) => void submitAdminQuote(event, move)} className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className={labelClass}>Agency<select required value={quoteForm.agencyId} onChange={(event) => {
              const agencyId = event.target.value;
              const vehicleId = moveVehicles.find((vehicle) => relationId(vehicle.agencyId) === agencyId)?._id || "";
              setAdminQuoteForms((current) => ({ ...current, [move._id]: { ...quoteForm, agencyId, vehicleId } }));
            }} className={`${inputClass} mt-2`}>{approvedAgencies.map((item) => <option key={item._id} value={item._id}>{String(item.name)}</option>)}</select></label>
            <label className={labelClass}>Vehicle<select required value={quoteForm.vehicleId} onChange={(event) => setAdminQuoteForms((current) => ({ ...current, [move._id]: { ...quoteForm, vehicleId: event.target.value } }))} className={`${inputClass} mt-2`}>{selectedAgencyVehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{show(vehicle.vehicleType)} · {show(vehicle.make)} {show(vehicle.model)} ({show(vehicle.volumeM3)} m³)</option>)}</select></label>
            <label className={labelClass}>Amount<input required type="number" min="0" value={quoteForm.amount} onChange={(event) => setAdminQuoteForms((current) => ({ ...current, [move._id]: { ...quoteForm, amount: event.target.value } }))} className={`${inputClass} mt-2`} /></label>
            <label className={labelClass}>Currency<input required maxLength={3} value={quoteForm.currency} onChange={(event) => setAdminQuoteForms((current) => ({ ...current, [move._id]: { ...quoteForm, currency: event.target.value.toUpperCase() } }))} className={`${inputClass} mt-2`} /></label>
            <label className={labelClass}>Crew offered<input required type="number" min={Number(move.crewRequired || 1)} max="30" value={quoteForm.crewCount} onChange={(event) => setAdminQuoteForms((current) => ({ ...current, [move._id]: { ...quoteForm, crewCount: event.target.value } }))} className={`${inputClass} mt-2`} /></label>
            <label className={labelClass}>Valid until<input required type="datetime-local" value={quoteForm.validUntil} onChange={(event) => setAdminQuoteForms((current) => ({ ...current, [move._id]: { ...quoteForm, validUntil: event.target.value } }))} className={`${inputClass} mt-2`} /></label>
            <label className={`${labelClass} sm:col-span-2`}>Message<input value={quoteForm.message} onChange={(event) => setAdminQuoteForms((current) => ({ ...current, [move._id]: { ...quoteForm, message: event.target.value } }))} className={`${inputClass} mt-2`} /></label>
            <button disabled={busy === move._id || !quoteForm.vehicleId} className={`${buttonClass} self-end`}>{busy === move._id ? "Sending…" : "Send quote on agency's behalf"}</button>
          </form>
        )}
      </article>
    );
  }

  if (!role) return null;

  const sections: Section[] = isPartner ? ["VEHICLES", "REQUESTS", "MOVES"] : ["AGENCIES", "VEHICLES", "MOVES", "QUOTES"];
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">{isPartner ? "Moving agency partner" : "Marketplace administration"}</p>
          <h1 className="mt-2 text-3xl font-black text-white">{isPartner ? "Manage moving jobs" : "Movers marketplace"}</h1>
          <p className="mt-2 text-sm text-slate-400">{isPartner ? "Maintain your vehicle fleet, quote incoming moves, and manage accepted jobs." : "Review agencies and fleets, monitor relocation requests and quotes, and confirm completed cash payments."}</p>
        </div>
        {isPartner && agency && <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusStyle(String(agency.status))}`}>Agency {String(agency.status)}</span>}
      </div>

      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error}{isPartner && error.includes("Moving agency profile not found") && <Link href="/movers/apply" className="ml-2 font-bold underline">Apply as a moving agency</Link>}</div>}

      {isPartner && agency && agency.status !== "APPROVED" && (
        <div className="mt-6 rounded-2xl border border-amber-900 bg-amber-950/30 p-5 text-sm text-amber-100">
          Your agency is {String(agency.status).toLowerCase()}. Operations approval is required before you can publish fleet vehicles or quote customer requests.
          {agency.reviewNotes ? <p className="mt-2">{String(agency.reviewNotes)}</p> : null}
        </div>
      )}

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-800 pb-3">
        {sections.map((item) => <button key={item} onClick={() => setSection(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black ${section === item ? "bg-orange-400 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>{headings[item]}</button>)}
      </div>

      {canManage && section === "AGENCIES" && (
        <form onSubmit={addAgency} className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-3">
          <p className="text-sm font-bold text-white sm:col-span-3">Create an approved moving agency or Operations-managed fleet.</p>
          {([
            ["name", "Agency / fleet name"], ["registrationNumber", "Business registration"], ["email", "Contact email"],
            ["phone", "Contact phone"], ["address", "Business address"], ["city", "Main city"],
          ] as const).map(([field, caption]) => <label key={field} className={labelClass}>{caption}<input required type={field === "email" ? "email" : "text"} value={agencyForm[field]} onChange={(event) => setAgencyForm((current) => ({ ...current, [field]: event.target.value }))} className={`${inputClass} mt-2`} /></label>)}
          <label className={labelClass}>Description<input value={agencyForm.description} onChange={(event) => setAgencyForm((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          <label className={labelClass}>Existing partner user ID (optional)<input value={agencyForm.ownerUserId} onChange={(event) => setAgencyForm((current) => ({ ...current, ownerUserId: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          <p className="text-xs text-slate-400 sm:col-span-3">Leave the partner ID blank to have Operations manage the agency.</p>
          <button disabled={busy === "form"} className={`${buttonClass} sm:col-span-3`}>{busy === "form" ? "Saving…" : "Create approved agency"}</button>
        </form>
      )}

      {canManage && section === "VEHICLES" && (!isPartner || agency?.status === "APPROVED") && (
        <form onSubmit={addVehicle} className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-3">
          {!isPartner && rows.AGENCIES.filter((item) => item.status === "APPROVED").length > 0 ? (
            <label className={`${labelClass} sm:col-span-3`}>Approved agency<select required value={vehicleForm.agencyId} onChange={(event) => setVehicleForm((current) => ({ ...current, agencyId: event.target.value }))} className={`${inputClass} mt-2`}><option value="">Select an agency</option>{rows.AGENCIES.filter((item) => item.status === "APPROVED").map((item) => <option key={item._id} value={item._id}>{String(item.name)}{item.managedByPlatform ? " (Operations managed)" : ""}</option>)}</select></label>
          ) : isPartner && !agency ? null : !isPartner ? <p className="text-sm text-amber-200 sm:col-span-3">Create an agency first, then add a vehicle.</p> : null}
          {([
            ["make", "Make"], ["model", "Model"], ["registrationNumber", "Registration"], ["capacityKg", "Capacity (kg)"],
            ["volumeM3", "Cargo volume (m³)"], ["crewCapacity", "Crew capacity"], ["city", "Base city"],
          ] as const).map(([field, caption]) => <label key={field} className={labelClass}>{caption}<input required value={vehicleForm[field]} onChange={(event) => setVehicleForm((current) => ({ ...current, [field]: event.target.value }))} className={`${inputClass} mt-2`} /></label>)}
          <label className={labelClass}>Vehicle class<select value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm((current) => ({ ...current, vehicleType: event.target.value }))} className={`${inputClass} mt-2`}>{vehicleTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className={`${labelClass} sm:col-span-2`}>Description<input value={vehicleForm.description} onChange={(event) => setVehicleForm((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          <button disabled={busy === "form" || (!isPartner && !vehicleForm.agencyId)} className={`${buttonClass} self-end`}>{busy === "form" ? "Saving…" : isPartner ? "Submit vehicle for review" : "Add active vehicle"}</button>
        </form>
      )}

      {isPartner && section === "REQUESTS" && rows.REQUESTS.map((move) => {
        const availableVehicles = Array.isArray(move.vehicles) ? move.vehicles as Row[] : [];
        const existingQuote = move.existingQuote as Row | null;
        const form = quoteForms[move._id] || {
          vehicleId: availableVehicles[0]?._id || "", amount: "", currency: "RWF", crewCount: String(move.crewRequired || 2),
          message: "", validUntil: new Date(Math.min(Date.now() + 24 * 60 * 60 * 1000, new Date(String(move.scheduledAt)).getTime() - 60 * 60 * 1000)).toISOString().slice(0, 16),
        };
        return (
          <article key={move._id} className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">{show(move.pickupCity)} → {show(move.destinationCity)}</h2>
              <span className="text-xs font-bold text-amber-200">{new Date(String(move.scheduledAt)).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{show(move.pickupAddress)} → {show(move.destinationAddress)}</p>
            <p className="mt-1 text-xs text-slate-400">{show(move.moveType)} · {show(move.bedrooms)} bedrooms · {show(move.estimatedVolumeM3)} m³ · {show(move.crewRequired)} helpers · {show(move.estimatedDurationHours)} estimated hours</p>
            <p className="mt-1 text-xs text-slate-400">Floors {show(move.pickupFloor)} → {show(move.destinationFloor)} · inventory: {show(move.inventoryNotes)}</p>
            {availableVehicles.length === 0 ? <p className="mt-4 text-sm text-amber-200">You need an active vehicle matching the customer's requested class before you can quote.</p> : (
              <form onSubmit={(event) => void submitQuote(event, move)} className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className={labelClass}>Vehicle<select required value={form.vehicleId} onChange={(event) => setQuoteForms((current) => ({ ...current, [move._id]: { ...form, vehicleId: event.target.value } }))} className={`${inputClass} mt-2`}>{availableVehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{show(vehicle.vehicleType)} · {show(vehicle.make)} {show(vehicle.model)} ({show(vehicle.capacityKg)} kg)</option>)}</select></label>
                <label className={labelClass}>Total quote amount<input required type="number" min="0" value={form.amount} onChange={(event) => setQuoteForms((current) => ({ ...current, [move._id]: { ...form, amount: event.target.value } }))} className={`${inputClass} mt-2`} /></label>
                <label className={labelClass}>Currency<input required maxLength={3} value={form.currency} onChange={(event) => setQuoteForms((current) => ({ ...current, [move._id]: { ...form, currency: event.target.value.toUpperCase() } }))} className={`${inputClass} mt-2`} /></label>
                <label className={labelClass}>Crew offered<input required type="number" min={Number(move.crewRequired || 1)} max="30" value={form.crewCount} onChange={(event) => setQuoteForms((current) => ({ ...current, [move._id]: { ...form, crewCount: event.target.value } }))} className={`${inputClass} mt-2`} /></label>
                <label className={labelClass}>Quote valid until<input required type="datetime-local" value={form.validUntil} onChange={(event) => setQuoteForms((current) => ({ ...current, [move._id]: { ...form, validUntil: event.target.value } }))} className={`${inputClass} mt-2`} /></label>
                <label className={labelClass}>Message / included services<input value={form.message} onChange={(event) => setQuoteForms((current) => ({ ...current, [move._id]: { ...form, message: event.target.value } }))} className={`${inputClass} mt-2`} /></label>
                <button disabled={busy === move._id} className={`${buttonClass} sm:col-span-3`}>{busy === move._id ? "Sending…" : existingQuote ? "Update your quote" : "Send quote"}</button>
              </form>
            )}
          </article>
        );
      })}

      {isPartner && section === "MOVES" && rows.MOVES.map((move) => (
        <article key={move._id} className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-white">{show(move.pickupCity)} → {show(move.destinationCity)}</h2>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyle(String(move.status))}`}>{String(move.status)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{show(move.pickupAddress)} → {show(move.destinationAddress)}</p>
          <p className="mt-1 text-xs text-slate-400">{new Date(String(move.scheduledAt)).toLocaleString()} · customer {show(move.customerName)} · {show(move.vehicleId)}</p>
          {move.status === "ASSIGNED" && <button disabled={busy === move._id} onClick={() => void mutate(`/agency/moves/${move._id}/status`, "PATCH", { status: "IN_PROGRESS" }, move._id)} className={`${buttonClass} mt-4`}>Start move</button>}
          {move.status === "IN_PROGRESS" && <button disabled={busy === move._id} onClick={() => void mutate(`/agency/moves/${move._id}/status`, "PATCH", { status: "COMPLETED" }, move._id)} className={`${buttonClass} mt-4`}>Mark completed</button>}
        </article>
      ))}

      {loading ? <p className="mt-6 text-sm text-slate-400">Loading moving-service records…</p> : section === "REQUESTS" && rows.REQUESTS.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">There are no open move requests to quote right now.</div>
      ) : section !== "REQUESTS" && (rows[section].length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
          No records to show yet. {isPartner && section === "VEHICLES" && agency?.status === "APPROVED" ? "Add an approved vehicle above to start quoting relocation requests." : null}
        </div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <h2 className="font-black text-white">{headings[section]}</h2>
            <button onClick={() => void loadData()} className="text-xs font-bold text-orange-300">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-500"><tr>{columns[section].map((column) => <th key={column} className="px-4 py-3">{column.replace(/([A-Z])/g, " $1")}</th>)}<th className="px-4 py-3">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {rows[section].map((row) => (
                  <tr key={row._id} className="align-top text-slate-300">
                    {columns[section].map((column) => <td key={column} className="max-w-56 px-4 py-3">{column === "status" || column === "paymentStatus" ? <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${statusStyle(String(row[column]))}`}>{show(row[column])}</span> : show(row[column])}</td>)}
                    <td className="px-4 py-3">{section === "AGENCIES" && canReview && (row.status === "PENDING" || row.status === "REJECTED") ? <div className="flex gap-2"><button disabled={busy === row._id} onClick={() => void mutate(`/admin/agencies/${row._id}`, "PATCH", { status: "APPROVED" }, row._id)} className={buttonClass}>Approve</button><button disabled={busy === row._id} onClick={() => void mutate(`/admin/agencies/${row._id}`, "PATCH", { status: "REJECTED" }, row._id)} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300">Reject</button></div>
                      : section === "AGENCIES" && canReview && row.status === "APPROVED" ? <button disabled={busy === row._id} onClick={() => void mutate(`/admin/agencies/${row._id}`, "PATCH", { status: "SUSPENDED" }, row._id)} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300">Suspend</button>
                      : section === "VEHICLES" && canReview && row.status === "PENDING" ? <button disabled={busy === row._id} onClick={() => void mutate(`/admin/vehicles/${row._id}`, "PATCH", { status: "ACTIVE" }, row._id)} className={buttonClass}>Approve vehicle</button>
                      : section === "VEHICLES" && canReview && row.status === "ACTIVE" ? <button disabled={busy === row._id} onClick={() => void mutate(`/admin/vehicles/${row._id}`, "PATCH", { status: "MAINTENANCE" }, row._id)} className="rounded-lg border border-amber-900 px-3 py-2 text-xs font-bold text-amber-200">Set maintenance</button>
                      : section === "MOVES" && !isPartner && canManage && row.status === "COMPLETED" && row.paymentStatus !== "PAID" ? <div className="flex gap-2"><button disabled={busy === row._id} onClick={() => void mutate(`/admin/moves/${row._id}`, "PATCH", { paymentStatus: "PAID" }, row._id)} className={buttonClass}>Confirm cash paid</button><button disabled={busy === row._id} onClick={() => void mutate(`/admin/moves/${row._id}`, "PATCH", { paymentStatus: "FAILED" }, row._id)} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300">Payment failed</button></div>
                      : section === "MOVES" && !isPartner && canManage && row.status === "ASSIGNED" ? <div className="flex flex-wrap gap-2"><button disabled={busy === row._id} onClick={() => void mutate(`/admin/moves/${row._id}`, "PATCH", { status: "IN_PROGRESS" }, row._id)} className={buttonClass}>Start move</button><button disabled={busy === row._id} onClick={() => void mutate(`/admin/moves/${row._id}`, "PATCH", { status: "CANCELLED", statusNote: "Cancelled by Operations" }, row._id)} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300">Cancel</button></div>
                      : section === "MOVES" && !isPartner && canManage && row.status === "IN_PROGRESS" ? <button disabled={busy === row._id} onClick={() => void mutate(`/admin/moves/${row._id}`, "PATCH", { status: "COMPLETED" }, row._id)} className={buttonClass}>Mark completed</button>
                      : section === "MOVES" && !isPartner && canManage && ["OPEN", "QUOTED"].includes(String(row.status)) ? <button disabled={busy === row._id} onClick={() => void mutate(`/admin/moves/${row._id}`, "PATCH", { status: "CANCELLED", statusNote: "Cancelled by Operations" }, row._id)} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300">Cancel move</button>
                      : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!isPartner && section === "MOVES" && canManage && rows.MOVES
        .filter((move) => move.status === "OPEN" || move.status === "QUOTED")
        .map(renderAdminQuoteForm)}
      <div className="mt-6 flex justify-end"><button onClick={() => void loadData()} className="text-xs font-bold text-orange-300">Refresh data</button></div>
    </div>
  );
}
