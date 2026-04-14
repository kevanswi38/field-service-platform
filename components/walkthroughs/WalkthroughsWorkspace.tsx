"use client";

import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/components/providers/RoleProvider";
import { PlatformRole } from "@/types/roles";
import AttachmentsPanel from "@/components/work-orders/AttachmentsPanel";
import NotesPanel from "@/components/work-orders/NotesPanel";
import WalkthroughChecklistsPanel from "@/components/walkthroughs/WalkthroughChecklistsPanel";

type PersonSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type WalkthroughRecord = {
  id: string;
  title: string | null;
  status: string;
  assignedToId: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  updatedAt: string;
  lead: {
    id: string;
    companyName: string | null;
    contactName: string | null;
    status: string;
  } | null;
  customer: {
    id: string;
    name: string;
    customerNumber: string | null;
  } | null;
  site: {
    id: string;
    name: string;
    siteCode: string | null;
    city: string | null;
    state: string | null;
  } | null;
  assignedTo: PersonSummary | null;
  _count: {
    checklists: number;
    estimates: number;
  };
};

type WalkthroughsResponse = {
  data?: WalkthroughRecord[];
  meta?: {
    statuses?: string[];
  };
  error?: {
    message?: string;
  };
};

const roleWalkthroughDefaultStatus: Partial<Record<PlatformRole, string>> = {
  support: "scheduled",
  sales: "scheduled",
};

const roleWalkthroughFocus: Record<PlatformRole, string> = {
  admin: "Cross-functional visibility for pre-service assessments and downstream readiness.",
  operations_manager:
    "Assignment and schedule context for walkthrough execution planning.",
  support: "Coordination view for upcoming assessments and follow-up transitions.",
  sales: "Qualification handoff view from lead to walkthrough and estimate preparation.",
  technician:
    "Walkthrough module is role-limited; execution context is surfaced in work orders.",
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function personLabel(person: PersonSummary | null) {
  if (!person) return "Unassigned";
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return fullName || person.email || person.id;
}

function leadLabel(lead: WalkthroughRecord["lead"]) {
  if (!lead) return "No linked lead";
  return lead.companyName || lead.contactName || lead.id;
}

function siteLabel(site: WalkthroughRecord["site"]) {
  if (!site) return "No linked site";
  const locality = [site.city, site.state].filter(Boolean).join(", ");
  return locality ? `${site.name} (${locality})` : site.name;
}

export default function WalkthroughsWorkspace() {
  const { role } = useRole();

  const [walkthroughs, setWalkthroughs] = useState<WalkthroughRecord[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedWalkthroughId, setSelectedWalkthroughId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatusFilter(roleWalkthroughDefaultStatus[role] ?? "");
  }, [role]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);

      const query = new URLSearchParams();
      if (statusFilter) {
        query.set("status", statusFilter);
      }

      const queryString = query.toString();
      const path = queryString
        ? `/api/walkthroughs?${queryString}`
        : "/api/walkthroughs";

      try {
        const response = await fetch(path, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | WalkthroughsResponse
          | null;

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Failed to load walkthroughs.");
        }

        const nextWalkthroughs = Array.isArray(payload?.data) ? payload.data : [];
        const nextStatuses = Array.isArray(payload?.meta?.statuses)
          ? payload.meta.statuses
          : [];

        setWalkthroughs(nextWalkthroughs);
        setStatusOptions(nextStatuses);
        setSelectedWalkthroughId((current) => {
          if (current && nextWalkthroughs.some((entry) => entry.id === current)) {
            return current;
          }
          return nextWalkthroughs[0]?.id ?? null;
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load walkthroughs."
        );
        setWalkthroughs([]);
        setSelectedWalkthroughId(null);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [statusFilter]);

  const selectedWalkthrough = useMemo(
    () => walkthroughs.find((entry) => entry.id === selectedWalkthroughId) ?? null,
    [walkthroughs, selectedWalkthroughId]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Assessments</p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
          Walkthroughs
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Walkthrough execution support records are visible here without changing
          walkthrough lifecycle control.
        </p>
        <p className="mt-2 text-sm text-slate-500">{roleWalkthroughFocus[role]}</p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            Walkthrough context
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
          <p className="mt-3 text-sm text-slate-500">Loading walkthroughs...</p>
        ) : walkthroughs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No walkthroughs match the current filter.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {walkthroughs.map((entry) => {
              const isActive = selectedWalkthroughId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedWalkthroughId(entry.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {entry.title || "Untitled walkthrough"}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {statusLabel(entry.status)}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {leadLabel(entry.lead)}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Updated {formatDateTime(entry.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedWalkthrough ? (
        <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            Selected walkthrough summary
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Lead</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {leadLabel(selectedWalkthrough.lead)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Customer</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {selectedWalkthrough.customer
                  ? selectedWalkthrough.customer.customerNumber
                    ? `${selectedWalkthrough.customer.name} (${selectedWalkthrough.customer.customerNumber})`
                    : selectedWalkthrough.customer.name
                  : "No linked customer"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Site</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {siteLabel(selectedWalkthrough.site)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Assignment
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {personLabel(selectedWalkthrough.assignedTo)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Start {formatDateTime(selectedWalkthrough.scheduledStart)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Checklists
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedWalkthrough._count.checklists}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Estimates</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedWalkthrough._count.estimates}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Lifecycle</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {statusLabel(selectedWalkthrough.status)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Completed {formatDateTime(selectedWalkthrough.completedAt)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!selectedWalkthroughId ? null : (
        <>
          <WalkthroughChecklistsPanel walkthroughId={selectedWalkthroughId} />
          <div className="grid gap-6 xl:grid-cols-2">
            <NotesPanel
              entityType="walkthrough"
              entityId={selectedWalkthroughId}
              title="Walkthrough Notes"
            />
            <AttachmentsPanel
              entityType="walkthrough"
              entityId={selectedWalkthroughId}
              title="Walkthrough Attachment Metadata"
            />
          </div>
        </>
      )}
    </div>
  );
}
