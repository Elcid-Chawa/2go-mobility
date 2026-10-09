"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  User,
  MapPin,
  ExternalLink,
  Search,
  Filter,
  AlertTriangle,
  Lock,
  ChevronRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  IOnboardingApplication,
  DriverOnboardingStatus,
  DriverVerificationStatus,
  Permission,
  UserRole,
} from "../../lib/types";
import { useAuth } from "../../context/AuthContext";
import { ProtectedButton } from "../../components/PermissionGate";

const INITIAL_APPLICATIONS: IOnboardingApplication[] = [
  {
    _id: "ONB-2026-001",
    driverId: {
      _id: "DRV-RW-9001",
      licenseNumber: "DL-RW-882910",
      userId: {
        _id: "USR-DRV-01",
        name: "Eric Mugabo",
        email: "eric.mugabo@example.com",
        phone: "+250788123456",
      },
    },
    onboardingStatus: DriverOnboardingStatus.COMPLETED,
    verificationStatus: DriverVerificationStatus.VERIFICATION_IN_PROGRESS,
    personalInfo: {
      firstName: "Eric",
      lastName: "Mugabo",
      dateOfBirth: "1992-05-15",
      phoneNumber: "+250788123456",
      idDocumentType: "NATIONAL_ID",
      idDocumentNumber: "1199280012345678",
    },
    address: {
      street: "KG 15 Ave, House 24",
      city: "Kigali",
      state: "Kigali City (Gasabo)",
      zipCode: "0000",
      country: "Rwanda",
    },
    vehicleInfo: {
      make: "Toyota",
      model: "Corolla Hybrid",
      year: 2022,
      color: "Pearl White",
      licensePlate: "RAD 892 B",
    },
    documents: {
      idDocument:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      drivingLicense:
        "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      vehicleRegistration:
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
      insuranceCertificate:
        "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
    },
    createdAt: "2026-09-22T21:30:00Z",
    updatedAt: "2026-09-22T23:15:00Z",
  },
  {
    _id: "ONB-2026-002",
    driverId: {
      _id: "DRV-RW-9002",
      licenseNumber: "DL-RW-554109",
      userId: {
        _id: "USR-DRV-02",
        name: "Aline Uwase",
        email: "aline.uwase@example.com",
        phone: "+250788654321",
      },
    },
    onboardingStatus: DriverOnboardingStatus.COMPLETED,
    verificationStatus: DriverVerificationStatus.VERIFICATION_IN_PROGRESS,
    personalInfo: {
      firstName: "Aline",
      lastName: "Uwase",
      dateOfBirth: "1995-11-20",
      phoneNumber: "+250788654321",
      idDocumentType: "PASSPORT",
      idDocumentNumber: "PC9988112",
    },
    address: {
      street: "KK 31 Ave",
      city: "Kigali",
      state: "Kigali City (Kicukiro)",
      country: "Rwanda",
    },
    vehicleInfo: {
      make: "Hyundai",
      model: "Ioniq Electric",
      year: 2023,
      color: "Midnight Blue",
      licensePlate: "RAE 441 X",
    },
    documents: {
      idDocument:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      drivingLicense:
        "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      vehicleRegistration:
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
      insuranceCertificate:
        "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
    },
    createdAt: "2026-09-22T18:45:00Z",
    updatedAt: "2026-09-22T20:10:00Z",
  },
  {
    _id: "ONB-2026-003",
    driverId: {
      _id: "DRV-RW-9003",
      licenseNumber: "DL-RW-110293",
      userId: {
        _id: "USR-DRV-03",
        name: "Jean Paul Habimana",
        email: "jeanpaul.h@example.com",
        phone: "+250788334455",
      },
    },
    onboardingStatus: DriverOnboardingStatus.COMPLETED,
    verificationStatus: DriverVerificationStatus.VERIFIED,
    personalInfo: {
      firstName: "Jean Paul",
      lastName: "Habimana",
      dateOfBirth: "1989-03-12",
      phoneNumber: "+250788334455",
      idDocumentType: "NATIONAL_ID",
      idDocumentNumber: "1198980044556677",
    },
    address: {
      street: "KN 5 Rd, House 12",
      city: "Kigali",
      state: "Kigali City (Nyarugenge)",
      country: "Rwanda",
    },
    vehicleInfo: {
      make: "Volkswagen",
      model: "Passat Executive",
      year: 2021,
      color: "Silver Metallic",
      licensePlate: "RAC 102 M",
    },
    documents: {
      idDocument:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      drivingLicense:
        "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      vehicleRegistration:
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
      insuranceCertificate:
        "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
    },
    createdAt: "2026-09-21T10:00:00Z",
    updatedAt: "2026-09-21T14:30:00Z",
  },
  {
    _id: "ONB-2026-004",
    driverId: {
      _id: "DRV-RW-9004",
      licenseNumber: "DL-RW-990012",
      userId: {
        _id: "USR-DRV-04",
        name: "Gaston Nshimiyimana",
        email: "gaston.n@example.com",
        phone: "+250788778899",
      },
    },
    onboardingStatus: DriverOnboardingStatus.REJECTED,
    verificationStatus: DriverVerificationStatus.REJECTED,
    personalInfo: {
      firstName: "Gaston",
      lastName: "Nshimiyimana",
      dateOfBirth: "1998-08-08",
      phoneNumber: "+250788778899",
      idDocumentType: "NATIONAL_ID",
      idDocumentNumber: "1199880099887766",
    },
    address: {
      street: "KG 201 St",
      city: "Kigali",
      state: "Kigali City",
      country: "Rwanda",
    },
    vehicleInfo: {
      make: "Nissan",
      model: "Sunny",
      year: 2012,
      color: "Red",
      licensePlate: "RAB 009 T",
    },
    documents: {
      idDocument:
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      drivingLicense:
        "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
    },
    createdAt: "2026-09-20T09:15:00Z",
    updatedAt: "2026-09-20T11:00:00Z",
  },
];

export default function OnboardingPage() {
  const { hasPermission, role } = useAuth();
  const [applications, setApplications] =
    useState<IOnboardingApplication[]>(INITIAL_APPLICATIONS);
  const [selectedApp, setSelectedApp] = useState<IOnboardingApplication | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load from backend if available, fallback to mock state
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/v1/onboarding/admin/applications",
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.applications?.length > 0) {
            setApplications(data.data.applications);
          }
        }
      } catch {
        // Use local fallback
      }
    };
    fetchApplications();
  }, []);

  const handleVerifyApplication = async (
    appId: string,
    status: DriverVerificationStatus,
    reason?: string,
  ) => {
    setIsProcessing(true);
    setActionMessage(null);

    try {
      // Try backend call
      const res = await fetch(
        `http://localhost:5000/api/v1/onboarding/admin/applications/${appId}/verify`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            rejectionReason: reason,
            notes: reviewNotes,
          }),
        },
      );

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setApplications((prev) =>
            prev.map((app) =>
              app._id === appId ? { ...app, ...result.data } : app,
            ),
          );
        }
      } else {
        // Update local state fallback
        setApplications((prev) =>
          prev.map((app) =>
            app._id === appId
              ? {
                  ...app,
                  verificationStatus: status,
                  onboardingStatus:
                    status === DriverVerificationStatus.VERIFIED
                      ? DriverOnboardingStatus.COMPLETED
                      : DriverOnboardingStatus.REJECTED,
                }
              : app,
          ),
        );
      }

      if (status === DriverVerificationStatus.VERIFIED) {
        setActionMessage({
          type: "success",
          text: `Application ${appId} approved successfully! Driver active and vehicle provisioned.`,
        });
      } else {
        setActionMessage({
          type: "error",
          text: `Application ${appId} has been rejected. Reason logged.`,
        });
      }

      // Update selected app if open
      if (selectedApp && selectedApp._id === appId) {
        setSelectedApp((prev) =>
          prev
            ? {
                ...prev,
                verificationStatus: status,
                onboardingStatus:
                  status === DriverVerificationStatus.VERIFIED
                    ? DriverOnboardingStatus.COMPLETED
                    : DriverOnboardingStatus.REJECTED,
              }
            : null,
        );
      }

      setIsRejectModalOpen(false);
      setRejectionReason("");
      setReviewNotes("");
    } catch {
      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app._id === appId
            ? {
                ...app,
                verificationStatus: status,
                onboardingStatus:
                  status === DriverVerificationStatus.VERIFIED
                    ? DriverOnboardingStatus.COMPLETED
                    : DriverOnboardingStatus.REJECTED,
              }
            : app,
        ),
      );
      setActionMessage({
        type: "success",
        text: `Application ${appId} updated to ${status}.`,
      });
      setIsRejectModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.personalInfo?.firstName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      app.personalInfo?.lastName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      app.driverId?.userId?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      app.vehicleInfo?.licensePlate
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      app._id?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "ALL") return true;
    if (filterStatus === "PENDING")
      return (
        app.verificationStatus ===
        DriverVerificationStatus.VERIFICATION_IN_PROGRESS
      );
    if (filterStatus === "VERIFIED")
      return app.verificationStatus === DriverVerificationStatus.VERIFIED;
    if (filterStatus === "REJECTED")
      return app.verificationStatus === DriverVerificationStatus.REJECTED;
    if (filterStatus === "DRAFT")
      return (
        app.onboardingStatus === DriverOnboardingStatus.NOT_STARTED ||
        app.onboardingStatus === DriverOnboardingStatus.IN_PROGRESS
      );

    return true;
  });

  const pendingCount = applications.filter(
    (a) =>
      a.verificationStatus ===
      DriverVerificationStatus.VERIFICATION_IN_PROGRESS,
  ).length;

  const verifiedCount = applications.filter(
    (a) => a.verificationStatus === DriverVerificationStatus.VERIFIED,
  ).length;

  const rejectedCount = applications.filter(
    (a) => a.verificationStatus === DriverVerificationStatus.REJECTED,
  ).length;

  const canVerify = hasPermission(Permission.DRIVER_VERIFY);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Driver Onboarding & Verification Center
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              RBAC Protected
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review submitted credentials, validate Rwandan driver documentation,
            and authorize vehicle provisioning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Current Role:</span>
            <span className="font-bold text-slate-200">{role}</span>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Metric Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">
            Total Applications
          </div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {applications.length}
          </div>
        </div>
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 bg-gradient-to-b from-amber-500/5 to-transparent">
          <div className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Awaiting Verification
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {pendingCount}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-emerald-400 font-medium">
            Verified & Active
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {verifiedCount}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-rose-400 font-medium">Rejected</div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: "ALL", label: "All", count: applications.length },
            {
              id: "PENDING",
              label: "Pending Review",
              count: pendingCount,
              highlight: true,
            },
            { id: "VERIFIED", label: "Verified", count: verifiedCount },
            { id: "REJECTED", label: "Rejected", count: rejectedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
                filterStatus === tab.id
                  ? "bg-emerald-500 text-slate-950 shadow-md"
                  : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filterStatus === tab.id
                    ? "bg-slate-950/20 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search driver, license, or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Applications List & Review Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredApplications.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="font-semibold text-slate-300">
                No applications match your filter
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try resetting search keywords or status filter.
              </p>
            </div>
          ) : (
            filteredApplications.map((app) => {
              const isSelected = selectedApp?._id === app._id;
              const isPending =
                app.verificationStatus ===
                DriverVerificationStatus.VERIFICATION_IN_PROGRESS;
              const isVerified =
                app.verificationStatus === DriverVerificationStatus.VERIFIED;
              const isRejected =
                app.verificationStatus === DriverVerificationStatus.REJECTED;

              return (
                <div
                  key={app._id}
                  onClick={() => setSelectedApp(app)}
                  className={`bg-slate-900 border rounded-2xl p-5 cursor-pointer transition hover:border-slate-700 shadow-md ${
                    isSelected
                      ? "border-emerald-500 ring-1 ring-emerald-500/50 bg-slate-900/90"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-base shrink-0">
                        {app.personalInfo?.firstName?.charAt(0) || "D"}
                        {app.personalInfo?.lastName?.charAt(0) || "R"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">
                            {app.personalInfo?.firstName}{" "}
                            {app.personalInfo?.lastName}
                          </h4>
                          <span className="text-xs text-slate-500">
                            ({app._id})
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          📞{" "}
                          {app.personalInfo?.phoneNumber ||
                            app.driverId?.userId?.phone}{" "}
                          • 🪪 ID: {app.personalInfo?.idDocumentNumber}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${
                        isVerified
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : isPending
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                            : isRejected
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                      }`}
                    >
                      {isPending
                        ? "⏳ Under Review"
                        : isVerified
                          ? "✓ Verified & Active"
                          : isRejected
                            ? "✕ Rejected"
                            : "Draft"}
                    </span>
                  </div>

                  {/* Vehicle & Address summary */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">
                        Proposed Vehicle:
                      </span>
                      <span className="font-medium text-slate-200">
                        🚗 {app.vehicleInfo?.make} {app.vehicleInfo?.model} (
                        {app.vehicleInfo?.year})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        Plate Number:
                      </span>
                      <span className="font-mono font-bold text-cyan-400">
                        {app.vehicleInfo?.licensePlate || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Location:</span>
                      <span className="text-slate-300">
                        📍 {app.address?.city}, {app.address?.country}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detailed Inspection Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xl">
          {selectedApp ? (
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    Credential Verification
                  </span>
                  <h3 className="font-extrabold text-white text-lg">
                    {selectedApp.personalInfo?.firstName}{" "}
                    {selectedApp.personalInfo?.lastName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    App ID: {selectedApp._id}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    selectedApp.verificationStatus ===
                    DriverVerificationStatus.VERIFIED
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : selectedApp.verificationStatus ===
                          DriverVerificationStatus.VERIFICATION_IN_PROGRESS
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  }`}
                >
                  {selectedApp.verificationStatus}
                </span>
              </div>

              {/* Personal Info */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Personal Credentials</span>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Document Type:</span>
                    <span className="font-semibold text-slate-200">
                      {selectedApp.personalInfo?.idDocumentType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      ID / Passport Number:
                    </span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {selectedApp.personalInfo?.idDocumentNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date of Birth:</span>
                    <span className="text-slate-200">
                      {selectedApp.personalInfo?.dateOfBirth
                        ? new Date(
                            selectedApp.personalInfo.dateOfBirth,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registered Phone:</span>
                    <span className="text-slate-200">
                      {selectedApp.personalInfo?.phoneNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Residential Address */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Residential Address</span>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-200">
                    {selectedApp.address?.street}
                  </div>
                  <div className="text-slate-400">
                    {selectedApp.address?.city}, {selectedApp.address?.state},{" "}
                    {selectedApp.address?.country}
                  </div>
                </div>
              </div>

              {/* Vehicle Specifications */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                  <span>Vehicle Specifications</span>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle:</span>
                    <span className="font-semibold text-slate-200">
                      {selectedApp.vehicleInfo?.make}{" "}
                      {selectedApp.vehicleInfo?.model} (
                      {selectedApp.vehicleInfo?.year})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Color:</span>
                    <span className="text-slate-200">
                      {selectedApp.vehicleInfo?.color}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plate Number:</span>
                    <span className="font-mono font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {selectedApp.vehicleInfo?.licensePlate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Grid */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Submitted Compliance Documents</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "National ID",
                      url: selectedApp.documents?.idDocument,
                    },
                    {
                      label: "Driving License",
                      url: selectedApp.documents?.drivingLicense,
                    },
                    {
                      label: "Vehicle Reg. (Yellow Card)",
                      url: selectedApp.documents?.vehicleRegistration,
                    },
                    {
                      label: "Insurance Certificate",
                      url: selectedApp.documents?.insuranceCertificate,
                    },
                  ].map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex flex-col justify-between space-y-2"
                    >
                      <span className="text-slate-400 text-[11px] font-medium">
                        {doc.label}
                      </span>
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Doc</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-600 italic">
                          Not Uploaded
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviewer Notes & Verification Actions Deck */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Reviewer Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Identity verified via NIDA database"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {!canVerify && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      You are in <span className="font-bold">{role}</span> role
                      (Read-only). Switch role in the header to approve or
                      reject.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <ProtectedButton
                    permission={Permission.DRIVER_VERIFY}
                    onClick={() =>
                      handleVerifyApplication(
                        selectedApp._id,
                        DriverVerificationStatus.VERIFIED,
                      )
                    }
                    disabled={
                      isProcessing ||
                      selectedApp.verificationStatus ===
                        DriverVerificationStatus.VERIFIED
                    }
                    className="py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-bold text-slate-950 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Provision</span>
                  </ProtectedButton>

                  <ProtectedButton
                    permission={Permission.DRIVER_VERIFY}
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={
                      isProcessing ||
                      selectedApp.verificationStatus ===
                        DriverVerificationStatus.REJECTED
                    }
                    className="py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Application</span>
                  </ProtectedButton>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 space-y-2">
              <Eye className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="font-semibold text-slate-400 text-sm">
                No Application Selected
              </p>
              <p className="text-xs">
                Select any driver application from the list to inspect
                credentials and execute verification.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && selectedApp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Reject Onboarding Application
                </h3>
                <p className="text-xs text-slate-400">
                  Application: {selectedApp._id}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Please specify the reason for rejection. This reason will be
              recorded on the driver&apos;s application record.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Expired driving license, invalid insurance certificate"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleVerifyApplication(
                    selectedApp._id,
                    DriverVerificationStatus.REJECTED,
                    rejectionReason ||
                      "Documents rejected by operations manager",
                  )
                }
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition shadow-lg disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
