export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">
          Platform Dashboard
        </h2>
        <p className="mt-2 text-slate-600">
          This will become the main internal control center for the field
          service platform.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Leads</h3>
          <p className="mt-2 text-sm text-slate-500">
            Incoming opportunities and service requests.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Customers</h3>
          <p className="mt-2 text-sm text-slate-500">
            Manage organizations, contacts, and account records.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Scheduling</h3>
          <p className="mt-2 text-sm text-slate-500">
            Coordinate walkthroughs, jobs, and field operations.
          </p>
        </div>
      </div>
    </div>
  );
}
