'use client';

import React, { useState } from 'react';
import { Car, Star, CheckCircle, Shield, Phone, Mail } from 'lucide-react';

export default function DriversPage() {
  const [drivers] = useState([
    {
      id: 'DRV-1029',
      name: 'Bob Chauffeur',
      phone: '+1888000333',
      email: 'bob.driver@example.com',
      license: 'DL-NY-102938',
      vehicle: '2023 Toyota Camry Hybrid (2GO-NY-909)',
      category: 'STANDARD',
      onlineStatus: 'ONLINE',
      availability: 'AVAILABLE',
      rating: 4.95,
      totalTrips: 143,
      totalEarnings: '$2,480.00',
    },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Driver & Fleet Management</h2>
        <p className="text-sm text-slate-400 mt-1">
          Active driver verification, vehicle fleet mapping, and availability status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <div key={driver.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 text-lg">
                  {driver.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{driver.name}</h3>
                  <p className="text-xs text-slate-400">{driver.id} • {driver.license}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {driver.onlineStatus}
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Assigned Vehicle:</span>
                <span className="font-medium text-slate-200">{driver.vehicle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-emerald-400">{driver.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Availability:</span>
                <span className="font-medium text-cyan-400">{driver.availability}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                <div className="font-bold text-amber-400">⭐ {driver.rating}</div>
                <div className="text-[10px] text-slate-500">Rating</div>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                <div className="font-bold text-slate-200">{driver.totalTrips}</div>
                <div className="text-[10px] text-slate-500">Trips</div>
              </div>
              <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                <div className="font-bold text-emerald-400">{driver.totalEarnings}</div>
                <div className="text-[10px] text-slate-500">Earnings</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
