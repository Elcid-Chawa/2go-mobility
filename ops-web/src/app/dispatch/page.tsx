'use client';

import React, { useState } from 'react';
import { Radio, Send, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';

export default function ManualDispatchPage() {
  const [selectedTrip, setSelectedTrip] = useState('TRIP-9901-PENDING');
  const [selectedDriver, setSelectedDriver] = useState('DRV-1029');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleManualDispatch = () => {
    setStatusMessage('Driver Bob Chauffeur (DRV-1029) assigned to Trip TRIP-9901-PENDING via Operations override.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Manual Dispatch Console</h2>
        <p className="text-sm text-slate-400 mt-1">
          Operations override to assign or reroute available drivers to unfulfilled or VIP customer ride requests.
        </p>
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
                TRIP-9901-PENDING — Alice Rider (Empire State Building ➡️ Grand Central Terminal) [$15.42]
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
                Bob Chauffeur (DRV-1029) — 0.4 km away — Toyota Camry (2GO-NY-909) [Rating: 4.95 ⭐]
              </option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            Manual dispatch will immediately notify the driver device via Socket.IO offer, set availability status to BUSY, and update the authoritative trip state machine.
          </div>
        </div>

        <button
          onClick={handleManualDispatch}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-bold text-slate-950 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          Execute Authoritative Dispatch Override
        </button>
      </div>
    </div>
  );
}
