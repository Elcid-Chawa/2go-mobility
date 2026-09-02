import './globals.css';
import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Car, Navigation2, Users, Radio, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: '2GO Operations Console — Mobility Command Center',
  description: 'Authoritative operations console for 2GO fleet, trips, dispatch, and monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
          <div>
            <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-xl tracking-wider">
                2G
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-tight text-white">2GO Operations</h1>
                <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </p>
              </div>
            </div>

            <nav className="space-y-1.5">
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200 hover:text-white transition"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                Dashboard & KPIs
              </Link>
              <Link
                href="/trips"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200 hover:text-white transition"
              >
                <Navigation2 className="w-4 h-4 text-cyan-400" />
                Active & Past Trips
              </Link>
              <Link
                href="/drivers"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200 hover:text-white transition"
              >
                <Car className="w-4 h-4 text-amber-400" />
                Drivers & Fleet
              </Link>
              <Link
                href="/dispatch"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 text-slate-200 hover:text-white transition"
              >
                <Radio className="w-4 h-4 text-indigo-400" />
                Manual Dispatch
              </Link>
            </nav>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>Environment</span>
              <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded text-[10px] border border-emerald-800">PROD-MVP</span>
            </div>
            <div>API: http://localhost:5000</div>
            <div>Version: 1.0.0-mvp</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-950">
          <header className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/40 backdrop-blur shrink-0">
            <div className="text-sm font-medium text-slate-400">
              Authoritative Command & Dispatch Center
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Socket.IO Connected</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                OP
              </div>
            </div>
          </header>
          <div className="p-8 flex-1">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
