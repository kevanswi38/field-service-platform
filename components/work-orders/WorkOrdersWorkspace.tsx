"use client";

import { useEffect, useMemo, useState } from "react";
import AttachmentsPanel from "@/components/work-orders/AttachmentsPanel";
import ChecklistsPanel from "@/components/work-orders/ChecklistsPanel";
import NotesPanel from "@/components/work-orders/NotesPanel";
import TasksPanel from "@/components/work-orders/TasksPanel";
import { useRole } from "@/components/providers/RoleProvider";
import { PlatformRole } from "@/types/roles";

type PersonSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type WorkOrderRecord = {
  id: string;
  workOrderNumber: string | null;
  title: string;
  serviceType: string | null;
  status: string;
  dueAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    customerNumber: string | null;
  };
  site: {
    id: string;
    name: string;
    siteCode: string | null;
    city: string | null;
    state: string | null;
  };
  assignedToId: string | null;
  assignedTo: PersonSummary | null;
  _count: {
    tasks: number;
    checklists: number;
    scheduleEvents: number;
  };
};

type WorkOrdersResponse = {
  data?: WorkOrderRecord[];
  meta?: {
    statuses?: string[];
  };
  error?: {
    message?: string;
  };
};

const roleWorkOrderDefaultStatus: Partial<Record<PlatformRole, string>> = {
  support: "new",
  technician: "scheduled",
};

const roleOperationalFocus: Record<PlatformRole, string> = {
  admin: "Cross-module oversight across assignment, scheduling, and execution support.",
  operations_manager:
    "Operational queue management with schedule and execution readiness context.",
  support:
    "Intake and queue triage context for open operational records that need coordination.",
  sales:
    "Work order visibility is limited to coordination context, not sales workflow ownership.",
  technician:
    "Execution-focused context showing schedule timing, assignment, and supporting records.",
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
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || person.id;
}

function siteLabel(site: WorkOrderRecord["site"]) {
  const locality = [site.city, site.state].filter(Boolean).join(", ");
  return locality ? `${site.name} (${locality})` : site.name;
}

export default function WorkOrdersWorkspace() {
  const { role } = useRole();

  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatusFilter(roleWorkOrderDefaultStatus[role] ?? "");
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
        ? `/api/work-orders?${queryString}`
        : "/api/work-orders";

      try {
        const response = await fetch(path, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as WorkOrdersResponse | null;

        if (!response.ok) {
          throw new Error(payload?.error?.message ?? "Failed to load work orders.");
        }

        const nextWorkOrders = Array.isArray(payload?.data) ? payload.data : [];
        const nextStatuses = Array.isArray(payload?.meta?.statuses)
          ? payload.meta.statuses
          : [];

        setWorkOrders(nextWorkOrders);
        setStatusOptions(nextStatuses);
        setSelectedWorkOrderId((current) => {
          if (current && nextWorkOrders.some((entry) => entry.id === current)) {
            return current;
          }
          return nextWorkOrders[0]?.id ?? null;
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load work orders."
        );
        setWorkOrders([]);
        setSelectedWorkOrderId(null);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [statusFilter]);

  const selectedWorkOrder = useMemo(
    () => workOrders.find((entry) => entry.id === selectedWorkOrderId) ?? null,
    [workOrders, selectedWorkOrderId]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Operations</p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
          Work Orders
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Work order execution support is visible here while lifecycle control remains on
          the Work Order itself.
        </p>
        <p className="mt-2 text-sm text-slate-500">{roleOperationalFocus[role]}</p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            Work order context
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
          <p className="mt-3 text-sm text-slate-500">Loading work orders...</p>
        ) : workOrders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No work orders match the current filter.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {workOrders.map((entry) => {
              const isActive = selectedWorkOrderId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedWorkOrderId(entry.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {entry.workOrderNumber || entry.title}
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
                    {entry.customer.name} - {entry.site.name}
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

      {selectedWorkOrder ? (
        <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            Selected work order summary
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Customer</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {selectedWorkOrder.customer.customerNumber
                  ? `${selectedWorkOrder.customer.name} (${selectedWorkOrder.customer.customerNumber})`
                  : selectedWorkOrder.customer.name}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Site</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {siteLabel(selectedWorkOrder.site)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Assignment</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {personLabel(selectedWorkOrder.assignedTo)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Scheduling Window
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDateTime(selectedWorkOrder.scheduledStart)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                End {formatDateTime(selectedWorkOrder.scheduledEnd)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Tasks</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedWorkOrder._count.tasks}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Checklists
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedWorkOrder._count.checklists}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Schedule Events
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedWorkOrder._count.scheduleEvents}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!selectedWorkOrderId ? null : (
        <>
          <TasksPanel workOrderId={selectedWorkOrderId} />
          <ChecklistsPanel workOrderId={selectedWorkOrderId} />
          <div className="grid gap-6 xl:grid-cols-2">
            <NotesPanel
              entityType="work_order"
              entityId={selectedWorkOrderId}
              title="Work Order Notes"
            />
            <AttachmentsPanel
              entityType="work_order"
              entityId={selectedWorkOrderId}
              title="Work Order Attachment Metadata"
            />
          </div>
        </>
      )}
    </div>
  );
}
