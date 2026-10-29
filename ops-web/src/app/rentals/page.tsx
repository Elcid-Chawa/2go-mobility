"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { rentalFile, rentalRequest, rentalUpload } from "../../lib/api";
import { Permission } from "../../lib/types";

type Section = "AGENCIES" | "VEHICLES" | "DRIVERS" | "RATES" | "LICENSES" | "BOOKINGS";
type RecordRow = Record<string, unknown> & { _id: string; status?: string; reviewNotes?: string };

const staffSections: Section[] = ["AGENCIES", "VEHICLES", "DRIVERS", "RATES", "LICENSES", "BOOKINGS"];
const categories = ["ECONOMY", "COMPACT", "SEDAN", "SUV", "LUXURY", "VAN"];
const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500";
const labelClass = "block text-xs font-bold text-slate-400";
const buttonClass = "rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-60";

function show(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (item.name) return String(item.name);
    if (item.make || item.model) return `${item.make || ""} ${item.model || ""}`.trim();
    return JSON.stringify(value);
  }
  return String(value);
}

function statusStyle(status?: string) {
  return status === "APPROVED" || status === "ACTIVE" || status === "VERIFIED" || status === "CONFIRMED" || status === "PAID"
    ? "border-emerald-800 bg-emerald-950/60 text-emerald-300"
    : status === "REJECTED" || status === "DECLINED" || status === "SUSPENDED" || status === "FAILED"
      ? "border-rose-900 bg-rose-950/50 text-rose-300"
      : "border-amber-900 bg-amber-950/40 text-amber-200";
}

export default function RentalOperationsPage() {
  const { role, hasPermission } = useAuth();
  const isPartner = role === "RENTAL_PARTNER";
  const canManage = hasPermission(Permission.RENTAL_MANAGE);
  const canReview = hasPermission(Permission.RENTAL_REVIEW);
  const [section, setSection] = useState<Section>("AGENCIES");
  const [rows, setRows] = useState<Record<Section, RecordRow[]>>({
    AGENCIES: [],
    VEHICLES: [],
    DRIVERS: [],
    RATES: [],
    LICENSES: [],
    BOOKINGS: [],
  });
  const [agency, setAgency] = useState<RecordRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [editingVehicleId, setEditingVehicleId] = useState("");
  const [editingDriverId, setEditingDriverId] = useState("");
  const [editingRateId, setEditingRateId] = useState("");
  const [agencyForm, setAgencyForm] = useState({
    name: "", registrationNumber: "", email: "", phone: "", address: "", description: "", ownerUserId: "",
  });
  const [vehicleForm, setVehicleForm] = useState({
    make: "", model: "", year: String(new Date().getFullYear()), registrationNumber: "", vin: "",
    category: "SEDAN", seats: "5", transmission: "AUTOMATIC", fuel: "PETROL", city: "", description: "", photoUrl: "", agencyId: "",
  });
  const [driverForm, setDriverForm] = useState({
    name: "", phone: "", email: "", licenseNumber: "", licenseExpiresAt: "", dailyRate: "",
  });
  const [rateForm, setRateForm] = useState({
    category: "SEDAN", currency: "RWF", hourlyRate: "", dailyRate: "", weeklyRate: "",
    minimumHours: "24", securityDeposit: "", chauffeurDailyRate: "0", agencyId: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isPartner) {
        const [dashboard, vehicles, drivers, rates, bookings] = await Promise.all([
          rentalRequest<{ agency: RecordRow }>("/partner/dashboard"),
          rentalRequest<RecordRow[]>("/partner/vehicles"),
          rentalRequest<RecordRow[]>("/partner/drivers"),
          rentalRequest<RecordRow[]>("/partner/rates"),
          rentalRequest<RecordRow[]>("/partner/bookings"),
        ]);
        setAgency(dashboard.agency);
        setRows((current) => ({ ...current, VEHICLES: vehicles, DRIVERS: drivers, RATES: rates, BOOKINGS: bookings }));
      } else {
        const [agencies, vehicles, drivers, rates, licenses, bookings] = await Promise.all([
          rentalRequest<RecordRow[]>("/admin/agencies"),
          rentalRequest<RecordRow[]>("/admin/vehicles"),
          rentalRequest<RecordRow[]>("/admin/drivers"),
          rentalRequest<RecordRow[]>("/admin/rates"),
          rentalRequest<RecordRow[]>("/admin/licenses"),
          rentalRequest<RecordRow[]>("/admin/bookings"),
        ]);
        setRows({ AGENCIES: agencies, VEHICLES: vehicles, DRIVERS: drivers, RATES: rates, LICENSES: licenses, BOOKINGS: bookings });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load rental data.");
    } finally {
      setLoading(false);
    }
  }, [isPartner]);

  useEffect(() => {
    if (role) void loadData();
  }, [role, loadData]);

  useEffect(() => {
    if (role) setSection(role === "RENTAL_PARTNER" ? "VEHICLES" : "AGENCIES");
  }, [role]);

  async function mutate(path: string, method: "POST" | "PATCH", body: Record<string, unknown>, id = ""): Promise<boolean> {
    setBusyId(id || "form");
    setError("");
    try {
      await rentalRequest(path, { method, body: JSON.stringify(body) });
      await loadData();
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "The update could not be saved.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function addVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await mutate(isPartner
      ? editingVehicleId ? `/partner/vehicles/${editingVehicleId}` : "/partner/vehicles"
      : "/admin/vehicles",
    isPartner && editingVehicleId ? "PATCH" : "POST", {
      ...vehicleForm,
      year: Number(vehicleForm.year),
      seats: Number(vehicleForm.seats),
      photoUrl: vehicleForm.photoUrl || undefined,
      ...(isPartner ? {} : { agencyId: vehicleForm.agencyId }),
    });
    if (saved) setEditingVehicleId("");
  }

  async function addAgency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await mutate("/admin/agencies", "POST", {
      ...agencyForm,
      ownerUserId: agencyForm.ownerUserId.trim() || undefined,
    });
    if (saved) {
      setAgencyForm({ name: "", registrationNumber: "", email: "", phone: "", address: "", description: "", ownerUserId: "" });
      setSection("VEHICLES");
    }
  }

  async function addDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await mutate(editingDriverId ? `/partner/drivers/${editingDriverId}` : "/partner/drivers", editingDriverId ? "PATCH" : "POST", {
      ...driverForm,
      dailyRate: Number(driverForm.dailyRate),
      email: driverForm.email || undefined,
      licenseExpiresAt: new Date(`${driverForm.licenseExpiresAt}T23:59:59`).toISOString(),
    });
    if (saved) setEditingDriverId("");
  }

  async function addRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await mutate(isPartner
      ? editingRateId ? `/partner/rates/${editingRateId}` : "/partner/rates"
      : "/admin/rates",
    isPartner && editingRateId ? "PATCH" : "POST", {
      ...rateForm,
      hourlyRate: Number(rateForm.hourlyRate),
      dailyRate: Number(rateForm.dailyRate),
      weeklyRate: Number(rateForm.weeklyRate),
      minimumHours: Number(rateForm.minimumHours),
      securityDeposit: Number(rateForm.securityDeposit),
      chauffeurDailyRate: Number(rateForm.chauffeurDailyRate),
      ...(isPartner ? {} : { agencyId: rateForm.agencyId }),
    });
    if (saved) setEditingRateId("");
  }

  async function uploadDriverLicense(driverId: string, file: File) {
    setBusyId(driverId);
    setError("");
    try {
      await rentalUpload(`/partner/drivers/${driverId}/license-document`, file);
      await loadData();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the driver licence.");
    } finally {
      setBusyId("");
    }
  }

  const headings: Record<Section, string> = {
    AGENCIES: "Agencies",
    VEHICLES: "Rental vehicles",
    DRIVERS: "Rental drivers",
    RATES: "Pricing proposals",
    LICENSES: "Customer driving licences",
    BOOKINGS: "Rental bookings",
  };
  const columns: Record<Section, string[]> = {
    AGENCIES: ["name", "managedByPlatform", "registrationNumber", "email", "phone", "address", "description", "status", "reviewNotes"],
    VEHICLES: ["make", "model", "year", "registrationNumber", "category", "city", "agencyId", "status"],
    DRIVERS: ["name", "phone", "licenseNumber", "licenseExpiresAt", "documentFilename", "dailyRate", "agencyId", "status"],
    RATES: ["category", "currency", "hourlyRate", "dailyRate", "weeklyRate", "securityDeposit", "chauffeurDailyRate", "agencyId", "status"],
    LICENSES: ["userId", "licenseNumber", "issuingCountry", "expiresAt", "documentFilename", "status", "reviewNotes"],
    BOOKINGS: ["customerId", "vehicleId", "agencyId", "startAt", "endAt", "driverOption", "rentalAmount", "driverAmount", "securityDeposit", "totalDue", "currency", "status", "paymentStatus"],
  };

  function actionsFor(sectionKey: Section, row: RecordRow) {
    let documentAction: ReactNode = null;
    if (!isPartner && (sectionKey === "LICENSES" || sectionKey === "DRIVERS") && typeof row.documentFilename === "string") {
      documentAction = <button onClick={async () => {
        try {
          const filePath = sectionKey === "LICENSES"
            ? `/licenses/${row._id}/document`
            : `/admin/drivers/${row._id}/license-document`;
          const url = await rentalFile(filePath);
          const link = document.createElement("a");
          link.href = url;
          const extension = String(row.documentFilename).match(/\.(jpg|png|webp|pdf)$/i)?.[0] || "";
          link.download = `rental-license-${row._id}${extension}`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (fileError) {
          setError(fileError instanceof Error ? fileError.message : "Unable to open the licence document.");
        }
      }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-cyan-300">Open document</button>;
    }
    if (isPartner && sectionKey === "DRIVERS") {
      return (
        <div className="flex flex-col gap-2">
          <button onClick={() => {
            setEditingDriverId(row._id);
            setDriverForm({
              name: String(row.name || ""), phone: String(row.phone || ""), email: String(row.email || ""),
              licenseNumber: String(row.licenseNumber || ""), licenseExpiresAt: String(row.licenseExpiresAt || "").slice(0, 10),
              dailyRate: String(row.dailyRate || ""),
            });
          }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-cyan-300">Edit</button>
          <label className="cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-center text-xs font-bold text-slate-300">
            {busyId === row._id ? "Uploading…" : row.documentFilename ? "Replace licence" : "Upload licence"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={busyId === row._id}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadDriverLicense(row._id, file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      );
    }
    if (isPartner && sectionKey === "VEHICLES") {
      return <button onClick={() => {
        setEditingVehicleId(row._id);
        setVehicleForm({
          make: String(row.make || ""), model: String(row.model || ""), year: String(row.year || ""),
          registrationNumber: String(row.registrationNumber || ""), vin: String(row.vin || ""),
          category: String(row.category || "SEDAN"), seats: String(row.seats || "5"),
          transmission: String(row.transmission || "AUTOMATIC"), fuel: String(row.fuel || "PETROL"),
          city: String(row.city || ""), description: String(row.description || ""), photoUrl: String(row.photoUrl || ""), agencyId: "",
        });
      }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-cyan-300">Edit</button>;
    }
    if (isPartner && sectionKey === "RATES") {
      return <button onClick={() => {
        setEditingRateId(row._id);
        setRateForm({
          category: String(row.category || "SEDAN"), currency: String(row.currency || "RWF"),
          hourlyRate: String(row.hourlyRate ?? ""), dailyRate: String(row.dailyRate ?? ""),
          weeklyRate: String(row.weeklyRate ?? ""), minimumHours: String(row.minimumHours ?? "24"),
          securityDeposit: String(row.securityDeposit ?? ""), chauffeurDailyRate: String(row.chauffeurDailyRate ?? "0"), agencyId: "",
        });
      }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-cyan-300">Edit</button>;
    }
    if (isPartner && sectionKey === "BOOKINGS" && row.status === "PENDING_AGENCY") {
      return (
        <div className="flex gap-2">
          <button disabled={busyId === row._id} onClick={() => void mutate(`/partner/bookings/${row._id}`, "PATCH", { status: "CONFIRMED" }, row._id)} className={buttonClass}>Confirm</button>
          <button disabled={busyId === row._id} onClick={() => void mutate(`/partner/bookings/${row._id}`, "PATCH", { status: "DECLINED" }, row._id)} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300">Decline</button>
        </div>
      );
    }
    if (!canReview) return documentAction;
    const reviews: Partial<Record<Section, { path: string; statuses: string[] }>> = {
      AGENCIES: { path: "agencies", statuses: ["APPROVED", "REJECTED", "SUSPENDED"] },
      VEHICLES: { path: "vehicles", statuses: ["ACTIVE", "REJECTED", "MAINTENANCE", "INACTIVE"] },
      DRIVERS: { path: "drivers", statuses: ["ACTIVE", "REJECTED", "INACTIVE"] },
      RATES: { path: "rates", statuses: ["ACTIVE", "REJECTED"] },
      LICENSES: { path: "licenses", statuses: ["VERIFIED", "REJECTED"] },
    };
    const review = reviews[sectionKey];
    if (review) {
      const availableStatuses = review.statuses.filter((status) => status !== row.status);
      return (
        <div className="flex flex-wrap gap-2">
          {documentAction}
          {availableStatuses.map((status) => (
            <button
              key={status}
              disabled={
                busyId === row._id ||
                (sectionKey === "DRIVERS" && status === "ACTIVE" && !row.documentFilename)
              }
              onClick={() => {
                const reviewNotes = window.prompt(`Optional review note for ${status.toLowerCase()}:`);
                if (reviewNotes === null) return;
                void mutate(`/admin/${review.path}/${row._id}`, "PATCH", { status, reviewNotes }, row._id);
              }}
              className={status === "REJECTED" || status === "SUSPENDED"
                ? "rounded-lg border border-rose-900 px-3 py-2 text-xs font-bold text-rose-300"
                : buttonClass}
            >
              {status}
            </button>
          ))}
        </div>
      );
    }
    if (sectionKey === "BOOKINGS") {
      return (
        <div className="flex flex-wrap gap-2">
          {documentAction}
          {(row.paymentStatus === "PENDING" || row.paymentStatus === "FAILED") && row.status === "CONFIRMED" && (
            <button disabled={busyId === row._id} onClick={() => void mutate(`/admin/bookings/${row._id}`, "PATCH", { paymentStatus: "PAID" }, row._id)} className={buttonClass}>Confirm cash payment</button>
          )}
          {row.status === "CONFIRMED" && row.paymentStatus === "PAID" && (
            <button disabled={busyId === row._id} onClick={() => void mutate(`/admin/bookings/${row._id}`, "PATCH", { status: "COMPLETED" }, row._id)} className={buttonClass}>Complete</button>
          )}
        </div>
      );
    }
    return documentAction;
  }

  if (!role) return null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            {isPartner ? "Agency partner portal" : "Marketplace administration"}
          </p>
          <h1 className="mt-2 text-3xl font-black text-white">{isPartner ? "Manage your rentals" : "Auto rentals"}</h1>
          <p className="mt-2 text-sm text-slate-400">
            {isPartner ? "Manage your own inventory, driver roster, proposed prices and booking requests." : "Review marketplace partners and listings, verify licences, and reconcile manual payments."}
          </p>
        </div>
        {isPartner && agency && (
          <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${statusStyle(String(agency.status))}`}>
            Agency {String(agency.status)}
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">
          {error}
          {isPartner && error.includes("Rental agency profile not found") && (
            <Link href="/rentals/apply" className="ml-2 font-bold underline">Complete your agency application</Link>
          )}
        </div>
      )}

      {isPartner && agency?.status !== "APPROVED" && agency && (
        <div className="mt-6 rounded-2xl border border-amber-900 bg-amber-950/30 p-5 text-sm text-amber-100">
          Your agency application is {String(agency.status).toLowerCase()}. Operations approval is required before adding or publishing listings.
          {agency.reviewNotes ? <p className="mt-2 text-amber-200">Review note: {String(agency.reviewNotes)}</p> : null}
        </div>
      )}

      {isPartner && (
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Vehicles", rows.VEHICLES.length],
            ["Drivers", rows.DRIVERS.length],
            ["Price proposals", rows.RATES.length],
            ["Bookings", rows.BOOKINGS.filter((booking) => booking.status === "PENDING_AGENCY" || booking.status === "CONFIRMED").length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-bold text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-slate-800 pb-3">
        {(isPartner ? (["VEHICLES", "DRIVERS", "RATES", "BOOKINGS"] as Section[]) : staffSections).map((item) => (
          <button key={item} onClick={() => setSection(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black ${section === item ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
            {headings[item]}
          </button>
        ))}
      </div>

      {canManage && section === "AGENCIES" && (
        <form onSubmit={addAgency} className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-3">
          <p className="text-sm font-bold text-white sm:col-span-3">Add an agency or create Operations-managed fleet inventory.</p>
          {([
            ["name", "Agency / fleet name"], ["registrationNumber", "Business registration"], ["email", "Contact email"],
            ["phone", "Contact phone"], ["address", "Address"],
          ] as const).map(([field, caption]) => (
            <label key={field} className={labelClass}>{caption}<input required type={field === "email" ? "email" : "text"} value={agencyForm[field]} onChange={(event) => setAgencyForm((current) => ({ ...current, [field]: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          ))}
          <label className={labelClass}>Description<input value={agencyForm.description} onChange={(event) => setAgencyForm((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          <label className={labelClass}>Existing partner user ID (optional)<input value={agencyForm.ownerUserId} onChange={(event) => setAgencyForm((current) => ({ ...current, ownerUserId: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          <p className="text-xs leading-5 text-slate-400 sm:col-span-3">Leave the partner user ID empty to have Operations manage this approved agency. You can add vehicles, rates, and drivers for it without an agency partner account.</p>
          <button disabled={busyId === "form"} className={`${buttonClass} self-end sm:col-span-3`}>{busyId === "form" ? "Saving…" : "Create approved agency"}</button>
        </form>
      )}

      {canManage && (!isPartner || agency?.status === "APPROVED") && section === "VEHICLES" && (
        <form onSubmit={addVehicle} className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-4">
          {editingVehicleId && <p className="text-xs font-bold text-cyan-300 sm:col-span-4">Editing vehicle. Saving returns it to Operations review.</p>}
          {!isPartner && (rows.AGENCIES.filter((item) => item.status === "APPROVED").length > 0 ? (
            <label className={`${labelClass} sm:col-span-2`}>Approved agency<select required value={vehicleForm.agencyId} onChange={(event) => setVehicleForm((current) => ({ ...current, agencyId: event.target.value }))} className={`${inputClass} mt-2`}><option value="">Select an agency</option>{rows.AGENCIES.filter((item) => item.status === "APPROVED").map((item) => <option key={item._id} value={item._id}>{String(item.name)}{item.managedByPlatform ? " (Operations managed)" : ""}</option>)}</select></label>
          ) : <p className="text-sm text-amber-200 sm:col-span-4">Create an agency or Operations-managed fleet first. <button type="button" onClick={() => setSection("AGENCIES")} className="font-bold underline">Add agency</button></p>)}
          {([
            ["make", "Make"], ["model", "Model"], ["year", "Year"], ["registrationNumber", "Registration"], ["vin", "VIN"],
            ["seats", "Seats"], ["city", "City"], ["photoUrl", "Photo URL"],
          ] as const).map(([field, caption]) => (
            <label key={field} className={labelClass}>{caption}<input required={field !== "photoUrl"} value={vehicleForm[field]} onChange={(event) => setVehicleForm((current) => ({ ...current, [field]: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          ))}
          <label className={labelClass}>Category<select value={vehicleForm.category} onChange={(event) => setVehicleForm((current) => ({ ...current, category: event.target.value }))} className={`${inputClass} mt-2`}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className={labelClass}>Transmission<select value={vehicleForm.transmission} onChange={(event) => setVehicleForm((current) => ({ ...current, transmission: event.target.value }))} className={`${inputClass} mt-2`}><option>AUTOMATIC</option><option>MANUAL</option></select></label>
          <label className={labelClass}>Fuel<select value={vehicleForm.fuel} onChange={(event) => setVehicleForm((current) => ({ ...current, fuel: event.target.value }))} className={`${inputClass} mt-2`}><option>PETROL</option><option>DIESEL</option><option>HYBRID</option><option>ELECTRIC</option></select></label>
          <label className={`${labelClass} sm:col-span-2`}>Description<input value={vehicleForm.description} onChange={(event) => setVehicleForm((current) => ({ ...current, description: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          <button disabled={busyId === "form" || (!isPartner && !vehicleForm.agencyId)} className={`${buttonClass} self-end`}>{busyId === "form" ? "Saving…" : editingVehicleId ? "Save and resubmit" : isPartner ? "Submit vehicle for review" : "Add active vehicle"}</button>
          {editingVehicleId && <button type="button" onClick={() => setEditingVehicleId("")} className="self-end text-xs text-slate-400">Cancel edit</button>}
        </form>
      )}

      {isPartner && section === "DRIVERS" && agency?.status === "APPROVED" && (
        <form onSubmit={addDriver} className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-3">
          {editingDriverId && <p className="text-xs font-bold text-cyan-300 sm:col-span-3">Editing driver. Saving returns this driver to Operations review.</p>}
          {([
            ["name", "Driver full name"], ["phone", "Phone"], ["email", "Email"], ["licenseNumber", "Licence number"],
            ["licenseExpiresAt", "Licence expiry date"], ["dailyRate", "Daily driver rate"],
          ] as const).map(([field, caption]) => (
            <label key={field} className={labelClass}>{caption}<input required={field !== "email"} type={field === "licenseExpiresAt" ? "date" : field === "email" ? "email" : "text"} value={driverForm[field]} onChange={(event) => setDriverForm((current) => ({ ...current, [field]: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          ))}
          <button disabled={busyId === "form"} className={`${buttonClass} self-end`}>{editingDriverId ? "Save and resubmit" : "Submit driver for review"}</button>
          {editingDriverId && <button type="button" onClick={() => setEditingDriverId("")} className="self-end text-xs text-slate-400">Cancel edit</button>}
        </form>
      )}

      {canManage && (!isPartner || agency?.status === "APPROVED") && section === "RATES" && (
        <form onSubmit={addRate} className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-4">
          {editingRateId && <p className="text-xs font-bold text-cyan-300 sm:col-span-4">Editing rate. Saving returns it to Operations review.</p>}
          {!isPartner && (rows.AGENCIES.filter((item) => item.status === "APPROVED").length > 0 ? (
            <label className={`${labelClass} sm:col-span-2`}>Approved agency<select required value={rateForm.agencyId} onChange={(event) => setRateForm((current) => ({ ...current, agencyId: event.target.value }))} className={`${inputClass} mt-2`}><option value="">Select an agency</option>{rows.AGENCIES.filter((item) => item.status === "APPROVED").map((item) => <option key={item._id} value={item._id}>{String(item.name)}{item.managedByPlatform ? " (Operations managed)" : ""}</option>)}</select></label>
          ) : <p className="text-sm text-amber-200 sm:col-span-4">Create an agency or Operations-managed fleet first. <button type="button" onClick={() => setSection("AGENCIES")} className="font-bold underline">Add agency</button></p>)}
          <label className={labelClass}>Category<select value={rateForm.category} onChange={(event) => setRateForm((current) => ({ ...current, category: event.target.value }))} className={`${inputClass} mt-2`}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          {([
            ["currency", "Currency"], ["hourlyRate", "Hourly rate"], ["dailyRate", "Daily rate"], ["weeklyRate", "Weekly rate"],
            ["minimumHours", "Minimum hours"], ["securityDeposit", "Security deposit"], ["chauffeurDailyRate", "Chauffeur daily rate"],
          ] as const).map(([field, caption]) => (
            <label key={field} className={labelClass}>{caption}<input required value={rateForm[field]} onChange={(event) => setRateForm((current) => ({ ...current, [field]: event.target.value }))} className={`${inputClass} mt-2`} /></label>
          ))}
          <button disabled={busyId === "form" || (!isPartner && !rateForm.agencyId)} className={`${buttonClass} self-end`}>{busyId === "form" ? "Saving…" : editingRateId ? "Save and resubmit" : isPartner ? "Submit price proposal" : "Set active prices"}</button>
          {editingRateId && <button type="button" onClick={() => setEditingRateId("")} className="self-end text-xs text-slate-400">Cancel edit</button>}
        </form>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="font-black text-white">{headings[section]}</h2>
          <button onClick={() => void loadData()} className="text-xs font-bold text-cyan-300">Refresh</button>
        </div>
        {loading ? <p className="p-6 text-sm text-slate-400">Loading rental records…</p> : rows[section].length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No records to show yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-950/70 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>{columns[section].map((column) => <th key={column} className="px-4 py-3">{column.replace(/([A-Z])/g, " $1")}</th>)}<th className="px-4 py-3">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows[section].map((row) => (
                  <tr key={row._id} className="align-top text-slate-300">
                    {columns[section].map((column) => (
                      <td key={column} className="max-w-56 px-4 py-3">
                        {column === "status" || column === "paymentStatus" ? (
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black ${statusStyle(String(row[column] || ""))}`}>{show(row[column])}</span>
                        ) : <span className="break-words">{show(row[column])}</span>}
                      </td>
                    ))}
                    <td className="px-4 py-3">{actionsFor(section, row) || <span className="text-slate-600">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
