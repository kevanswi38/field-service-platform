"use client";

import { useRole } from "@/components/providers/RoleProvider";
import { PlatformRole } from "@/types/roles";

const roles: PlatformRole[] = [
  "admin",
  "operations_manager",
  "support",
  "sales",
  "technician",
];

export default function PlatformHeader() {
  const { role, setRole } = useRole();

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="flex min-h-[88px] items-center justify-between px-8">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Internal Platform
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Field Service Software
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 lg:block">
            Active workspace
          </div>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as PlatformRole)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-slate-500"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
