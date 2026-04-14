"use client";

import { useEffect, useState } from "react";

type EstimateRecord = {
  id: string;
  estimateNumber: string | null;
  title: string | null;
  status: string;
  total: string | null;
  customer: {
    id: string;
    name: string;
    customerNumber: string | null;
  } | null;
  lead: {
    id: string;
    companyName: string | null;
    contactName: string | null;
  } | null;
  walkthrough: {
    id: string;
    title: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type EstimatesResponse = {
  data?: EstimateRecord[];
  meta?: {
    statuses?: string[];
  };
  error?: {
    message?: string;
  };
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString();
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);

      const query = new URLSearchParams();
      if (statusFilter) {
        query.set("status", statusFilter);
      }

      const queryString = query.toString();
      const path = queryString ? `/api/estimates?${queryString}` : "/api/estimates";

      const response = await fetch(path, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | EstimatesResponse
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.error?.message ?? "Failed to load estimates.");
        setEstimates([]);
        setIsLoading(false);
        return;
      }

      setEstimates(Array.isArray(payload?.data) ? payload.data : []);
      setStatusOptions(
        Array.isArray(payload?.meta?.statuses) ? payload.meta.statuses : []
      );
      setIsLoading(false);
    }

    void load();
  }, [statusFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Quoting</p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
          Estimates
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Minimal governed estimate module foundation for lead-to-operations workflow
          traceability.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            Estimate records
          </h3>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>Status filter</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading estimates...</p>
        ) : estimates.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No estimates found.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {estimates.map((estimate) => (
              <article
                key={estimate.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {estimate.estimateNumber || estimate.title || "Untitled estimate"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {statusLabel(estimate.status)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Total: {estimate.total ?? "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Customer: {estimate.customer?.name ?? "Unlinked"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Lead:{" "}
                  {estimate.lead
                    ? estimate.lead.companyName || estimate.lead.contactName || estimate.lead.id
                    : "Unlinked"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Walkthrough: {estimate.walkthrough?.title || estimate.walkthrough?.id || "Unlinked"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Updated: {formatDateTime(estimate.updatedAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
