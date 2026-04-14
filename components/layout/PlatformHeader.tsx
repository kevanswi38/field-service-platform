"use client";

import { useRole } from "@/components/providers/RoleProvider";

export default function PlatformHeader() {
  const { role, user, signOut } = useRole();
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;

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

          <div className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm">
            <p className="font-medium text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">Role: {role}</p>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-500"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
