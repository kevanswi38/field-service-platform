import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarCheck2,
  ClipboardList,
  Sparkles,
} from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  note: string;
  icon: React.ComponentType<{ size?: number }>;
};

function StatCard({
  label,
  value,
  change,
  trend,
  note,
  icon: Icon,
}: StatCardProps) {
  const isUp = trend === "up";

  return (
    <div className="rounded-[26px] border border-white/60 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>

          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </h3>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {change}
        </span>

        <span className="text-xs text-slate-500">{note}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-8 rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-slate-200">
              <Sparkles size={13} />
              Core workspace
            </div>

            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-[2.75rem]">
              Run service work in one place.
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Track leads, customers, sites, schedules, and daily operations in
              a cleaner system built for field teams.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[380px]">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                Access
              </p>
              <p className="mt-2 text-sm font-semibold text-white">User Role</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                Setup
              </p>
              <p className="mt-2 text-sm font-semibold text-white">Reusable</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                Flow
              </p>
              <p className="mt-2 text-sm font-semibold text-white">Scalable</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Leads"
          value="24"
          change="+12%"
          trend="up"
          note="this month"
          icon={ClipboardList}
        />

        <StatCard
          label="Clients"
          value="12"
          change="+4%"
          trend="up"
          note="active accounts"
          icon={Briefcase}
        />

        <StatCard
          label="Sites"
          value="31"
          change="+8%"
          trend="up"
          note="tracked"
          icon={Building2}
        />

        <StatCard
          label="Jobs"
          value="8"
          change="-2%"
          trend="down"
          note="scheduled"
          icon={CalendarCheck2}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="rounded-[30px] border border-white/60 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] xl:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Activity</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                Recent updates
              </h3>
            </div>

            <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
              Live
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">Lead added</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                A new request entered the pipeline.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">
                Visit booked
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                A walkthrough was placed on the calendar.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">
                Site changed
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Property details were updated.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/60 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-medium text-slate-500">Focus</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Core goals
          </h3>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              Role access
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              Clean setup
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              Smooth workflow
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              Better ops UX
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
