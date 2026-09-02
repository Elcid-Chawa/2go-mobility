'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Car, DollarSign, Navigation, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DashboardKPIs {
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  onlineDrivers: number;
  totalDrivers: number;
  totalCustomers: number;
  totalVehicles: number;
  totalRevenue: number;
  currency: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalTrips: 1,
    activeTrips: 0,
    completedTrips: 1,
    onlineDrivers: 1,
    totalDrivers: 1,
    totalCustomers: 1,
    totalVehicles: 1,
    totalRevenue: 15.42,
    currency: 'USD',
  });

  const [activeTripsList, setActiveTripsList] = useState<any[]>([
    {
      _id: 'TRIP-8921-NY',
      customer: 'Alice Rider',
      driver: 'Bob Chauffeur',
      pickup: 'Empire State Building',
      destination: 'Grand Central Terminal',
      fare: '$15.42',
      status: 'PAID',
      time: 'Just now',
    },
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Operations Overview</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time fleet status, dispatch metrics, and live financial transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Authoritative Dispatch Online
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Trips</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">{kpis.activeTrips}</div>
            <p className="text-xs text-slate-400 mt-1">Live rides in transit</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Online Drivers</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              {kpis.onlineDrivers} <span className="text-sm font-normal text-slate-500">/ {kpis.totalDrivers}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Available for auto-dispatch</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gross Revenue</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white">
              ${kpis.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-1">{kpis.completedTrips} completed trips</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Platform Health</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-emerald-400">100%</div>
            <p className="text-xs text-slate-400 mt-1">State machine zero anomalies</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Map & Active Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map Representation */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between h-[420px] relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <div>
              <h3 className="font-bold text-white text-base">Live Spatial Fleet Map</h3>
              <p className="text-xs text-slate-400">2dsphere proximity tracking & real-time GPS feeds</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Center: Manhattan Core</span>
            </div>
          </div>

          {/* Interactive Simulation Radar Graphic */}
          <div className="absolute inset-0 flex items-center justify-center opacity-70">
            <div className="w-96 h-96 rounded-full border border-emerald-500/20 flex items-center justify-center animate-pulse">
              <div className="w-64 h-64 rounded-full border border-emerald-500/30 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border border-emerald-500/40 bg-emerald-500/5 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_15px_#22c55e]" />
                </div>
              </div>
            </div>
            {/* Active Driver Marker */}
            <div className="absolute top-1/3 left-1/2 flex items-center gap-1.5 bg-slate-950/90 border border-emerald-500/50 px-2 py-1 rounded-md text-[11px] text-emerald-300 shadow-xl">
              <Car className="w-3 h-3 text-emerald-400" />
              <span>Driver: Bob (ONLINE)</span>
            </div>
          </div>

          <div className="z-10 flex items-center justify-between text-xs text-slate-400 bg-slate-950/90 p-3 rounded-xl border border-slate-800">
            <span>Active Geospatial Drivers: 1</span>
            <span>Broadcast Frequency: Real-Time WebSockets</span>
          </div>
        </div>

        {/* Live Trip Activity Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Live Trip Stream</h3>
            <p className="text-xs text-slate-400 mb-4">Authoritative state transitions</p>

            <div className="space-y-3">
              {activeTripsList.map((trip) => (
                <div key={trip._id} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200">{trip.customer}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {trip.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <div>📍 From: {trip.pickup}</div>
                    <div>🏁 To: {trip.destination}</div>
                    <div>🚗 Driver: {trip.driver}</div>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-300">
                    <span>Fare: {trip.fare}</span>
                    <span className="text-slate-500">{trip.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-400 font-medium">Auto-refreshing via Socket.IO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
