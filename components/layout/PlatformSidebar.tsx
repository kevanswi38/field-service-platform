import Link from "next/link";
import { getNavigationForRole } from "@/lib/permissions";
import { PlatformRole } from "@/types/roles";

type PlatformSidebarProps = {
  role?: PlatformRole;
};

export default function PlatformSidebar({
  role = "admin",
}: PlatformSidebarProps) {
  const navItems = getNavigationForRole(role);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
          Field Service Platform
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Operations</h2>
      </div>

      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
