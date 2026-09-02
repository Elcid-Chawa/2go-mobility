'use client';

import React, { useState } from 'react';
import { Navigation, Clock, DollarSign, User, ShieldCheck } from 'lucide-react';

export default function TripsPage() {
  const [trips] = useState([
    {
      id: 'TRIP-8921-NY',
      customer: 'Alice Rider (+1888000222)',
      driver: 'Bob Chauffeur (+1888000333)',
      category: 'STANDARD',
      pickup: 'Empire State Building',
      destination: 'Grand Central Terminal',
      distance: '1.24 km',
      duration: '4 mins',
      fare: '$15.42',
      paymentMethod: 'CASH',
      status: 'PAID',
      rating: 5,
    },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Trips Management</h2>
        <p className="text-sm text-slate-400 mt-1">
          Real-time oversight of all booked, active, completed, and rated trips.
        </p>
      </div>

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
                <th className="px-6 py-4">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-semibold text-white">
                    <div>{trip.id}</div>
                    <span className="text-[11px] text-slate-400 font-normal">{trip.category}</span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-medium text-slate-200">{trip.customer}</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-medium text-slate-200">{trip.driver}</div>
                  </td>
                  <td className="px-6 py-4 text-xs space-y-0.5">
                    <div className="text-slate-200">🟢 {trip.pickup}</div>
                    <div className="text-slate-400">🏁 {trip.destination}</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="font-bold text-emerald-400">{trip.fare}</div>
                    <div className="text-slate-400">{trip.distance} ({trip.duration})</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-amber-400 font-bold text-xs">
                    {'⭐'.repeat(trip.rating)} ({trip.rating}.0)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
