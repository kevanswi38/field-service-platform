export default function CustomersPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-500">Accounts</p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
          Customers
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Manage organizations, account relationships, and core contact records
          across the platform.
        </p>
      </div>

      <div className="rounded-[30px] border border-white/60 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          Customer workspace
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          This area will become the central customer record system for accounts,
          contacts, service history, and operational relationships.
        </p>
      </div>
    </div>
  );
}
