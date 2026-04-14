"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/components/providers/RoleProvider";
import { PlatformRole } from "@/types/roles";

type PersonSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type ScheduleEventRecord = {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  assignedToId: string | null;
  workOrderId: string | null;
  assignedTo: PersonSummary | null;
  workOrder: {
    id: string;
    workOrderNumber: string | null;
    title: string;
    status: string;
    customer: {
      id: string;
      name: string;
    };
    site: {
      id: string;
      name: string;
      city: string | null;
      state: string | null;
    };
  } | null;
};

type SchedulingResponse = {
  data?: ScheduleEventRecord[];
  meta?: {
    statuses?: string[];
  };
  error?: {
    message?: string;
  };
};

const roleDefaultStatus: Partial<Record<PlatformRole, string>> = {
  sales: "scheduled",
  support: "scheduled",
  technician: "confirmed",
};

const roleSchedulingFocus: Record<PlatformRole, string> = {
  admin: "Cross-role schedule visibility for operational integrity.",
  operations_manager: "Calendar readiness and assignment balancing context.",
  support: "Coordination context for upcoming events and schedule updates.",
  sales: "Awareness view for scheduled assessments and customer commitments.",
  technician: "Execution window awareness for confirmed and active schedule events.",
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function personLabel(person: PersonSummary | null) {
  if (!person) return "Unassigned";
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return fullName || person.email || person.id;
}

function siteLabel(event: ScheduleEventRecord) {
  if (!event.workOrder?.site) return "No linked site";
  const { name, city, state } = event.workOrder.site;
  const locality = [city, state].filter(Boolean).join(", ");
  return locality ? `${name} (${locality})` : name;
}

export default function SchedulingWorkspace() {
  const { role } = useRole();

  const [events, setEvents] = useState<ScheduleEventRecord[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatusFilter(roleDefaultStatus[role] ?? "");
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
      const path = queryString ? `/api/scheduling?${queryString}` : "/api/scheduling";

      try {
        const response = await fetch(path, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | SchedulingResponse
          | null;

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Failed to load schedule events.");
        }

        setEvents(Array.isArray(payload?.data) ? payload.data : []);
        setStatusOptions(
          Array.isArray(payload?.meta?.statuses) ? payload.meta.statuses : []
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load schedule events."
        );
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [statusFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Planning</p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
          Scheduling
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Schedule events are shown as real operational records linked to work orders.
        </p>
        <p className="mt-2 text-sm text-slate-500">{roleSchedulingFocus[role]}</p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-white/60 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            Schedule events
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
          <p className="mt-3 text-sm text-slate-500">Loading schedule events...</p>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No schedule events match the current filter.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="mt-1 text-xs text-slate-500">{statusLabel(event.status)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(event.startsAt)} - {formatDateTime(event.endsAt)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Assigned: {personLabel(event.assignedTo)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Work order:{" "}
                  {event.workOrder
                    ? event.workOrder.workOrderNumber || event.workOrder.title
                    : "Unlinked"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Site: {siteLabel(event)}</p>
                {event.notes ? (
                  <p className="mt-1 text-xs text-slate-500">Notes: {event.notes}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
