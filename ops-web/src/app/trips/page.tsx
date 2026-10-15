'use client';

import React, { useEffect, useState } from 'react';
import { Navigation, Clock, DollarSign, User, ShieldCheck, MessageSquare } from 'lucide-react';
import { LiveTripChatModal } from '../../components/LiveTripChatModal';
import { apiRequest } from '../../lib/api';
import { Permission } from '../../lib/types';
import { PermissionGate } from '../../components/PermissionGate';

interface OpsTrip {
  _id: string;
  category: string;
  status: string;
  pickup: { address: string };
  destination: { address: string };
  distanceKm: number;
  estimatedDurationMinutes: number;
  estimatedFare: number;
  finalFare?: number;
  paymentMethod?: string;
  customerId?: { userId?: { name?: string; phone?: string } };
  driverId?: { userId?: { name?: string; phone?: string } };
  createdAt?: string;
}

export default function TripsPage() {
  const [selectedChatTrip, setSelectedChatTrip] = useState<OpsTrip | null>(null);
  const [trips, setTrips] = useState<OpsTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<OpsTrip[]>('/admin/trips')
      .then((result) => {
        if (active) setTrips(result);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load trips.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PermissionGate permission={Permission.VIEW_OPERATIONS}>
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Trips Management</h2>
        <p className="text-sm text-slate-400 mt-1">
          Real-time oversight of all booked, active, completed, and rated trips.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Trip ID & Category</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Distance & Fare</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Live Chat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {trips.map((trip) => (
                <tr key={trip._id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-semibold text-white">
                    <div className="font-mono text-xs">{trip._id}</div>
                    <span className="text-[11px] text-slate-400 font-normal">{trip.category}</span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-medium text-slate-200">{trip.customerId?.userId?.name || 'Customer'}</div>
                    <div className="text-slate-500">{trip.customerId?.userId?.phone || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-medium text-slate-200">{trip.driverId?.userId?.name || 'Not assigned'}</div>
                    <div className="text-slate-500">{trip.driverId?.userId?.phone || ''}</div>
                  </td>
                  <td className="px-6 py-4 text-xs space-y-0.5">
                    <div className="text-slate-200">🟢 {trip.pickup.address}</div>
                    <div className="text-slate-400">🏁 {trip.destination.address}</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-bold text-emerald-400">{Math.round(trip.finalFare ?? trip.estimatedFare).toLocaleString()} RWF</div>
                    <div className="text-slate-400">{trip.distanceKm.toFixed(1)} km ({trip.estimatedDurationMinutes} min)</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {trip.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedChatTrip(trip)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Live Chat</span>
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">Loading trips...</td></tr>
              )}
              {!loading && !error && trips.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No trips found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedChatTrip && (
        <LiveTripChatModal
          tripId={selectedChatTrip._id}
          customerName={selectedChatTrip.customerId?.userId?.name}
          driverName={selectedChatTrip.driverId?.userId?.name}
          isOpen={true}
          onClose={() => setSelectedChatTrip(null)}
        />
      )}
    </div>
    </PermissionGate>
  );
}
