import "./globals.css";
import React from "react";
import { Hanken_Grotesk, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import { OpsConsoleShell } from "../components/OpsConsoleShell";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken-grotesk",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata = {
  title: "2GO Operations Console — Mobility Command Center",
  description:
    "Authoritative operations console for 2GO fleet, driver onboarding, trips, dispatch, and monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${hankenGrotesk.variable} ${spaceGrotesk.variable} bg-slate-950 text-slate-100 min-h-screen`}
      >
        <AuthProvider>
          <OpsConsoleShell>{children}</OpsConsoleShell>
        </AuthProvider>
      </body>
    </html>
  );
}
