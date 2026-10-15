"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Permission, IOnboardingApplication, DriverVerificationStatus } from "../../lib/types";
import { apiFile, apiRequest } from "../../lib/api";
import { PermissionGate } from "../../components/PermissionGate";

interface ApplicationResponse {
  applications: IOnboardingApplication[];
  total: number;
}

export default function OnboardingPage() {
  const [applications, setApplications] = useState<IOnboardingApplication[]>([]);
  const [selected, setSelected] = useState<IOnboardingApplication | null>(null);
  const [filter, setFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});

  async function loadApplications() {
    setError("");
    try {
      const response = await apiRequest<ApplicationResponse>(
        "/driver-onboarding/admin/applications?limit=100",
      );
      setApplications(response.applications);
      setSelected((current) =>
        current
          ? response.applications.find((item) => item._id === current._id) || null
          : null,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load onboarding applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  useEffect(() => {
    let active = true;
    const urls: Record<string, string> = {};
    async function loadDocuments() {
      if (!selected) {
        setDocumentUrls({});
        return;
      }
      await Promise.all(
        Object.entries(selected.documents || {}).map(async ([key, reference]) => {
          if (!reference) return;
          try {
            urls[key] = /^https?:\/\//i.test(reference)
              ? reference
              : await apiFile(`/driver-onboarding/files/${encodeURIComponent(reference)}`);
          } catch {
            urls[key] = "";
          }
        }),
      );
      if (active) setDocumentUrls(urls);
      else Object.values(urls).forEach((url) => url.startsWith("blob:") && URL.revokeObjectURL(url));
    }
    void loadDocuments();
    return () => {
      active = false;
      Object.values(urls).forEach((url) => url.startsWith("blob:") && URL.revokeObjectURL(url));
    };
  }, [selected]);

  const visibleApplications = useMemo(() => applications.filter((application) => {
    const statusMatch =
      filter === "ALL" ||
      (filter === "PENDING" && application.verificationStatus === DriverVerificationStatus.VERIFICATION_IN_PROGRESS) ||
      (filter === "VERIFIED" && application.verificationStatus === DriverVerificationStatus.VERIFIED) ||
      (filter === "REJECTED" && application.verificationStatus === DriverVerificationStatus.REJECTED) ||
      (filter === "DRAFT" && ["NOT_STARTED", "IN_PROGRESS"].includes(application.onboardingStatus));
    const text = [
      application.personalInfo?.firstName,
      application.personalInfo?.lastName,
      application.driverId?.userId?.name,
      application.vehicleInfo?.licensePlate,
      application.driverId?.userId?.email,
    ].filter(Boolean).join(" ").toLowerCase();
    return statusMatch && text.includes(search.trim().toLowerCase());
  }), [applications, filter, search]);

  async function review(status: DriverVerificationStatus.VERIFIED | DriverVerificationStatus.REJECTED) {
    if (!selected) return;
    if (status === DriverVerificationStatus.REJECTED && !rejectionReason.trim()) {
      setError("Add a rejection reason so the driver knows what to correct.");
      return;
    }
    setProcessing(true);
    setError("");
    setMessage("");
    try {
      const updated = await apiRequest<IOnboardingApplication>(
        `/driver-onboarding/admin/applications/${selected._id}/verify`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, notes, rejectionReason }),
        },
      );
      setApplications((current) => current.map((item) => item._id === updated._id ? updated : item));
      setSelected(updated);
      setMessage(status === DriverVerificationStatus.VERIFIED
        ? "Driver approved. Their vehicle is now active and dispatch-eligible."
        : "Application rejected. The driver can update details and submit again.");
      setRejectionReason("");
      await loadApplications();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to update this application.");
    } finally {
      setProcessing(false);
    }
  }

  const pendingCount = applications.filter((item) => item.verificationStatus === DriverVerificationStatus.VERIFICATION_IN_PROGRESS).length;

  return (
    <PermissionGate permission={Permission.DRIVER_VERIFY}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">Driver verification</h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">Review identity and vehicle documents before enabling dispatch.</p>
          </div>
          <button onClick={() => void loadApplications()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </header>

        {error && <div role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>}
        {message && <div role="status" className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">{message}</div>}

        <section className="grid gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.5fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-white">Applications</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">{pendingCount} awaiting review</span>
              </div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or plate" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" />
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white">
                {["PENDING", "DRAFT", "VERIFIED", "REJECTED", "ALL"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? <p className="p-4 text-sm text-slate-400">Loading applications…</p> :
                visibleApplications.length === 0 ? <p className="p-4 text-sm text-slate-400">No applications match this filter.</p> :
                  visibleApplications.map((application) => (
                    <button
                      key={application._id}
                      onClick={() => { setSelected(application); setError(""); setMessage(""); }}
                      className={`block w-full border-b border-slate-800 p-4 text-left hover:bg-slate-800/60 ${selected?._id === application._id ? "bg-slate-800/70" : ""}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">{application.driverId?.userId?.name || `${application.personalInfo?.firstName || ""} ${application.personalInfo?.lastName || ""}`}</span>
                        <span className="text-[10px] text-slate-400">{application.verificationStatus.replaceAll("_", " ")}</span>
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">{application.driverId?.userId?.email || "No email"} · {application.vehicleInfo?.licensePlate || "No vehicle"}</span>
                    </button>
                  ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            {!selected ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-slate-400">Select an application to review.</div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">{selected.driverId?.userId?.name || "Driver application"}</h2>
                  <p className="mt-1 text-sm text-slate-400">{selected.driverId?.userId?.email} · {selected.driverId?.userId?.phone}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Date of birth" value={formatDate(selected.personalInfo?.dateOfBirth)} />
                  <Info label="ID" value={`${selected.personalInfo?.idDocumentType || ""} ${selected.personalInfo?.idDocumentNumber || ""}`} />
                  <Info label="Driving licence" value={selected.personalInfo?.drivingLicenseNumber} />
                  <Info label="Address" value={[selected.address?.street, selected.address?.city, selected.address?.state, selected.address?.country].filter(Boolean).join(", ")} />
                  <Info label="Vehicle" value={`${selected.vehicleInfo?.year || ""} ${selected.vehicleInfo?.make || ""} ${selected.vehicleInfo?.model || ""} · ${selected.vehicleInfo?.color || ""}`} />
                  <Info label="Registration / VIN" value={`${selected.vehicleInfo?.licensePlate || "—"} · ${selected.vehicleInfo?.vin || "—"}`} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Submitted documents</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries({
                      profilePhoto: "Profile photo",
                      vehiclePreviewImage: "Vehicle photo",
                      idDocument: "ID / passport",
                      drivingLicense: "Driving licence",
                      vehicleRegistration: "Registration / vignette",
                      insuranceCertificate: "Insurance",
                    }).map(([key, label]) => {
                      const source = documentUrls[key];
                      const reference = selected.documents?.[key as keyof IOnboardingApplication["documents"]];
                      return (
                        <div key={key} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                          <div className="mb-2 text-xs font-medium text-slate-300">{label}</div>
                          {source && /\.(png|jpe?g|webp)(\?|$)/i.test(source) ? (
                            <a href={source} target="_blank" rel="noreferrer"><img src={source} alt={label} className="h-36 w-full rounded object-cover" /></a>
                          ) : source ? (
                            <a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-cyan-300"><FileText className="h-4 w-4" />Open document</a>
                          ) : (
                            <p className="text-xs text-slate-500">{reference ? "Unable to load file" : "Not provided"}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selected.review?.rejectionReason && <Info label="Previous rejection reason" value={selected.review.rejectionReason} />}
                {selected.verificationStatus === DriverVerificationStatus.VERIFICATION_IN_PROGRESS && (
                  <div className="space-y-3 border-t border-slate-800 pt-4">
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal review notes (optional)" rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
                    <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Rejection reason (required to reject)" rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
                    <div className="flex flex-wrap gap-3">
                      <button disabled={processing} onClick={() => void review(DriverVerificationStatus.VERIFIED)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Approve and activate</button>
                      <button disabled={processing} onClick={() => void review(DriverVerificationStatus.REJECTED)} className="inline-flex items-center gap-2 rounded-lg border border-rose-700 px-4 py-2.5 text-sm font-bold text-rose-200 disabled:opacity-50"><XCircle className="h-4 w-4" />Reject with reason</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm text-slate-200">{value || "—"}</div>
    </div>
  );
}

function formatDate(value?: string | Date): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}
