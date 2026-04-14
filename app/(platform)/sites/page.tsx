export default function SitesPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-slate-500">Locations</p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
          Sites
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Track service locations, property details, and field-ready site
          records from one organized workspace.
        </p>
      </div>

      <div className="rounded-[30px] border border-white/60 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          Site workspace
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          This area will support service locations, access notes, site
          instructions, job context, and future map-aware operational views.
        </p>
      </div>
    </div>
  );
}
