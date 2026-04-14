"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/components/providers/RoleProvider";
import { getNavigationForRole } from "@/lib/permissions";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  ClipboardList,
} from "lucide-react";

function getNavIcon(href: string) {
  switch (href) {
    case "/dashboard":
      return LayoutDashboard;
    case "/leads":
      return ClipboardList;
    case "/customers":
      return Users;
    case "/sites":
      return Building2;
    case "/work-orders":
      return ClipboardList;
    case "/scheduling":
      return CalendarDays;
    case "/walkthroughs":
      return ClipboardList;
    case "/estimates":
      return ClipboardList;
    default:
      return LayoutDashboard;
  }
}

export default function PlatformSidebar() {
  const { role } = useRole();
  const pathname = usePathname();
  const navItems = getNavigationForRole(role);

  return (
    <aside className="flex h-screen w-76 shrink-0 flex-col border-r border-slate-800 bg-[#0b1220] text-white">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          Field Service Platform
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Operations Core
        </h2>

        <div className="mt-5 inline-flex rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs font-medium text-slate-300">
          Role: {role}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-4 px-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Navigation
          </p>
        </div>

        <nav>
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = getNavIcon(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.08)]"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        isActive
                          ? "bg-slate-100 text-slate-900"
                          : "bg-slate-800/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-white"
                      }`}
                    >
                      <Icon size={16} />
                    </span>

                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Workspace
          </p>
          <h3 className="mt-2 text-sm font-semibold text-white">
            Premium Operations Layer
          </h3>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Manage leads, customers, sites, scheduling, and field workflows from
            one structured system.
          </p>
        </div>
      </div>
    </aside>
  );
}
