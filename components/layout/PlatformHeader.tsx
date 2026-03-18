export default function PlatformHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Internal Platform
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Field Service Software
          </h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          Admin View
        </div>
      </div>
    </header>
  );
}
