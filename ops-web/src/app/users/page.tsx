"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { Permission, UserRole } from "../../lib/types";
import { apiRequest } from "../../lib/api";
import { PermissionGate } from "../../components/PermissionGate";
import { useAuth } from "../../context/AuthContext";

interface ManagedUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: string;
}

const roles: Array<{ value: UserRole; label: string }> = [
  { value: UserRole.CUSTOMER, label: "Customer" },
  { value: UserRole.DRIVER, label: "Driver (requires verification)" },
  { value: UserRole.AGENT, label: "Operations agent (read-only)" },
  { value: UserRole.DISPATCHER, label: "Dispatcher" },
  { value: UserRole.VIEWER, label: "Read-only auditor" },
  { value: UserRole.OPERATIONS, label: "Operations manager" },
  { value: UserRole.ADMIN, label: "Administrator" },
];

export default function UsersPage() {
  const { hasRole } = useAuth();
  const mayCreateStaff = hasRole(UserRole.ADMIN, UserRole.SYSTEM_OWNER);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: UserRole.CUSTOMER });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setError("");
    try {
      setUsers(await apiRequest<ManagedUser[]>("/admin/users"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const created = await apiRequest<ManagedUser>("/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setUsers((current) => [created, ...current]);
      setNotice(`${created.role} account created.`);
      setForm({ name: "", email: "", phone: "", password: "", role: UserRole.CUSTOMER });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create this account.");
    }
  }

  async function toggleStatus(user: ManagedUser) {
    const id = user._id || user.id;
    if (!id) return;
    const status = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setError("");
    try {
      const updated = await apiRequest<ManagedUser>(`/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setUsers((current) => current.map((item) => (item._id || item.id) === id ? updated : item));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update user status.");
    }
  }

  const selectableRoles = roles.filter((option) =>
    mayCreateStaff || [UserRole.CUSTOMER, UserRole.DRIVER].includes(option.value),
  );

  return (
    <PermissionGate permission={Permission.USER_MANAGE}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-white">User management</h1>
          <p className="mt-1 text-sm text-slate-400">Create rider and driver accounts. Staff roles are administrator-managed.</p>
        </header>
        {error && <p role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p>}

        <form onSubmit={createUser} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <h2 className="sm:col-span-2 xl:col-span-3 text-lg font-semibold text-white">Create account</h2>
          <Input label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <Input label="Email" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} required />
          <Input label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} required />
          <Input label="Temporary password (10+ characters)" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} required minLength={10} />
          <label className="text-xs font-semibold text-slate-300">
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white">
              {selectableRoles.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="self-end rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950">Create user</button>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-4 font-semibold text-white">Accounts</div>
          {loading ? <p className="p-4 text-sm text-slate-400">Loading users…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase text-slate-500"><tr><th className="p-3">User</th><th className="p-3">Phone</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
                <tbody>{users.map((user) => <tr key={user._id || user.id} className="border-t border-slate-800">
                  <td className="p-3"><div className="font-medium text-white">{user.name}</div><div className="text-xs text-slate-400">{user.email}</div></td>
                  <td className="p-3 text-slate-300">{user.phone}</td>
                  <td className="p-3 text-slate-300">{user.role}</td>
                  <td className="p-3"><span className={user.status === "ACTIVE" ? "text-emerald-300" : "text-amber-300"}>{user.status}</span></td>
                  <td className="p-3"><button onClick={() => void toggleStatus(user)} className="rounded border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800">{user.status === "ACTIVE" ? "Suspend" : "Activate"}</button></td>
                </tr>)}</tbody>
              </table>
              {!users.length && <p className="p-4 text-sm text-slate-400">No users found.</p>}
            </div>
          )}
        </section>
      </div>
    </PermissionGate>
  );
}

function Input({ label, value, onChange, type = "text", ...props }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return <label className="text-xs font-semibold text-slate-300">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white" {...props} /></label>;
}
