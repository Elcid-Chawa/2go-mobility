"use client";

import React, { useState } from "react";
import {
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  Lock,
  Shield,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Permission, UserRole } from "../../lib/types";
import {
  ProtectedButton,
  PermissionGate,
} from "../../components/PermissionGate";

export default function ManualDispatchPage() {
  const { hasPermission, role } = useAuth();
  const [selectedTrip, setSelectedTrip] = useState("TRIP-9901-PENDING");
  const [selectedDriver, setSelectedDriver] = useState("DRV-1029");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canDispatch = hasPermission(Permission.DISPATCH_EXECUTE);

  const handleManualDispatch = () => {
    setStatusMessage(
      "Driver Bob Chauffeur (DRV-1029) assigned to Trip TRIP-9901-PENDING via Operations override.",
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Manual Dispatch Console
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              RBAC Guarded
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Operations override to assign or reroute available drivers to
            unfulfilled or VIP customer ride requests.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Active Role:</span>
          <span className="font-bold text-slate-200">{role}</span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Unassigned / Searching Ride Request
            </label>
            <select
              value={selectedTrip}
              onChange={(e) => setSelectedTrip(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="TRIP-9901-PENDING">
                TRIP-9901-PENDING — Alice Rider (Kigali Heights ➡️ Kigali
                Convention Centre) [4,500 RWF]
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Candidate Driver (Online & Available)
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="DRV-1029">
                Bob Chauffeur (DRV-1029) — 0.4 km away — Toyota Corolla (RAD 892
                B) [Rating: 4.95 ⭐]
              </option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            Manual dispatch will immediately notify the driver device via
            Socket.IO offer, set availability status to BUSY, and update the
            authoritative trip state machine.
          </div>
        </div>

        {!canDispatch && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Manual dispatch execution is restricted for role{" "}
              <span className="font-bold">{role}</span>. Switch to{" "}
              <span className="font-bold">Dispatcher</span>,{" "}
              <span className="font-bold">Operations</span>, or{" "}
              <span className="font-bold">Admin</span> to execute overrides.
            </span>
          </div>
        )}

        <ProtectedButton
          permission={Permission.DISPATCH_EXECUTE}
          onClick={handleManualDispatch}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-bold text-slate-950 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>Execute Authoritative Dispatch Override</span>
        </ProtectedButton>
      </div>
    </div>
  );
}
