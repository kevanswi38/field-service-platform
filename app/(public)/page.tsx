import SessionEntryPanel from "@/components/auth/SessionEntryPanel";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Field Service Platform
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            A clean foundation for modern field service software
          </h1>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            This project is the reusable core for building service business
            software for industries like cleaning, HVAC, landscaping,
            maintenance, inspections, and mobile operations.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
              Leads
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
              Customers
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
              Sites
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
              Scheduling
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
              Walkthroughs
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700">
              Operations
            </div>
          </div>

          <SessionEntryPanel />
        </div>
      </div>
    </main>
  );
}
