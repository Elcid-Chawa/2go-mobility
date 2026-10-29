"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { moverRequest, registerRequest } from "../../../lib/api";

export default function MoverAgencyApplicationPage() {
  const { role } = useAuth();
  const hasPartnerSession = role === "MOVER_PARTNER";
  const [values, setValues] = useState({
    name: "", email: "", phone: "", password: "",
    agencyName: "", agencyEmail: "", agencyPhone: "", registrationNumber: "", address: "", city: "", description: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (!accountCreated && !hasPartnerSession) {
        await registerRequest({
          name: values.name,
          email: values.agencyEmail || values.email,
          phone: values.agencyPhone || values.phone,
          password: values.password,
          role: "MOVER_PARTNER",
        });
        setAccountCreated(true);
      }
      await moverRequest("/agencies/applications", {
        method: "POST",
        body: JSON.stringify({
          name: values.agencyName,
          registrationNumber: values.registrationNumber,
          email: values.email,
          phone: values.phone,
          address: values.address,
          city: values.city,
          description: values.description,
        }),
      });
      window.location.assign("/movers");
    } catch (applicationError) {
      setError(applicationError instanceof Error ? applicationError.message : "Unable to submit your agency application.");
    } finally {
      setSubmitting(false);
    }
  }

  const fields: {
    key: keyof typeof values;
    label: string;
    type?: string;
    required?: boolean;
    wide?: boolean;
  }[] = [
    { key: "name", label: "Account holder name", required: true },
    { key: "email", label: "Account email", type: "email", required: true },
    { key: "phone", label: "Phone number", required: true },
    { key: "password", label: "Password", type: "password", required: true },
    { key: "agencyName", label: "Agency name", required: true },
    { key: "agencyEmail", label: "Agency contact email", type: "email", required: true },
    { key: "agencyPhone", label: "Agency contact phone", required: true },
    { key: "registrationNumber", label: "Business registration", required: true },
    { key: "address", label: "Business address", required: true },
    { key: "city", label: "Main service city", required: true },
    { key: "description", label: "Moving services and fleet summary", wide: true },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-orange-300 hover:text-orange-200">← Back to 2GO</Link>
        <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Moving marketplace partner</p>
          <h1 className="mt-3 text-3xl font-black">List your moving agency</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Apply to receive relocation requests and send customers quotes with the right vehicle and crew. Operations reviews your agency and fleet before they appear in the marketplace.
          </p>
          <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">
            {fields.filter((field) => !hasPartnerSession || !["name", "email", "phone", "password"].includes(field.key)).map((field) => (
              <label key={field.key} className={`block text-xs font-bold text-slate-300 ${field.wide ? "sm:col-span-2" : ""}`}>
                {field.label}
                {field.key === "description" ? (
                  <textarea value={values[field.key]} onChange={(event) => update(field.key, event.target.value)} rows={3} maxLength={1000} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-orange-500" />
                ) : (
                  <input type={field.type || "text"} required={field.required} autoComplete={field.key === "password" ? "new-password" : undefined} minLength={field.key === "password" ? 6 : undefined} value={values[field.key]} onChange={(event) => update(field.key, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-orange-500" />
                )}
              </label>
            ))}
            {error && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200 sm:col-span-2">{error}</p>}
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <button type="submit" disabled={submitting} className="rounded-xl bg-orange-400 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">
                {submitting ? "Submitting…" : accountCreated || hasPartnerSession ? "Submit agency application" : "Create account & apply"}
              </button>
              <Link href="/movers" className="text-sm font-semibold text-slate-400 hover:text-white">Already a partner? Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
