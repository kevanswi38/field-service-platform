"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AttachmentsPanel from "@/components/work-orders/AttachmentsPanel";
import ChecklistsPanel from "@/components/work-orders/ChecklistsPanel";
import NotesPanel from "@/components/work-orders/NotesPanel";
import TasksPanel from "@/components/work-orders/TasksPanel";

type PersonSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type ActivityRecord = {
  id: string;
  action: string;
  message: string | null;
  occurredAt: string;
  actorUserId: string | null;
  actor: PersonSummary | null;
};

type AssignableUserRecord = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
};

type WorkOrderDetailRecord = {
  id: string;
  workOrderNumber: string | null;
  title: string;
  description: string | null;
  serviceType: string | null;
  status: string;
  estimateId: string | null;
  assignedToId: string | null;
  dueAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  completedAt: string | null;
  closedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
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
  estimate: {
    id: string;
    estimateNumber: string | null;
    title: string | null;
    status: string;
  } | null;
  assignedTo: PersonSummary | null;
  _count: {
    tasks: number;
    checklists: number;
    scheduleEvents: number;
  };
  activityLogs: ActivityRecord[];
};

type WorkOrderDetailResponse = {
  data?: WorkOrderDetailRecord;
  meta?: {
    statuses?: string[];
    allowedTransitions?: string[];
    canUpdate?: boolean;
    canEditAssignment?: boolean;
    assignableUsers?: AssignableUserRecord[];
  };
  error?: {
    message?: string;
  };
};

type WorkOrderDetailWorkspaceProps = {
  workOrderId: string;
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function toIsoDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function personLabel(person: PersonSummary | null) {
  if (!person) return "Unassigned";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || person.id;
}

function assignableUserLabel(user: AssignableUserRecord) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const display = name || user.email || user.id;
  return `${display} (${statusLabel(user.role)})`;
}

function estimateLabel(estimate: WorkOrderDetailRecord["estimate"]) {
  if (!estimate) return "Not linked";
  const ref = estimate.estimateNumber || estimate.title || estimate.id;
  return `${ref} (${statusLabel(estimate.status)})`;
}

function activityActorLabel(entry: ActivityRecord) {
  if (entry.actor) {
    return personLabel(entry.actor);
  }
  return entry.actorUserId ?? "System";
}

export default function WorkOrderDetailWorkspace({
  workOrderId,
}: WorkOrderDetailWorkspaceProps) {
  const [workOrder, setWorkOrder] = useState<WorkOrderDetailRecord | null>(null);
  const [statusValues, setStatusValues] = useState<string[]>([]);
  const [allowedTransitions, setAllowedTransitions] = useState<string[]>([]);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canEditAssignment, setCanEditAssignment] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUserRecord[]>([]);

  const [statusDraft, setStatusDraft] = useState("");
  const [assignedToIdDraft, setAssignedToIdDraft] = useState("");
  const [scheduledStartDraft, setScheduledStartDraft] = useState("");
  const [scheduledEndDraft, setScheduledEndDraft] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const statusOptions = useMemo(() => {
    if (!workOrder) return [];
    const options = [workOrder.status, ...allowedTransitions];
    return options.filter((value, index) => options.indexOf(value) === index);
  }, [allowedTransitions, workOrder]);

  async function load() {
    setIsLoading(true);
    setErrorMessage(null);

    const response = await fetch(`/api/work-orders/${workOrderId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | WorkOrderDetailResponse
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Failed to load work order.");
      setWorkOrder(null);
      setIsLoading(false);
      return;
    }

    setWorkOrder(payload.data);
    setStatusValues(Array.isArray(payload.meta?.statuses) ? payload.meta.statuses : []);
    setAllowedTransitions(
      Array.isArray(payload.meta?.allowedTransitions)
        ? payload.meta.allowedTransitions
        : []
    );
    setCanUpdate(Boolean(payload.meta?.canUpdate));
    setCanEditAssignment(Boolean(payload.meta?.canEditAssignment));
    setAssignableUsers(
      Array.isArray(payload.meta?.assignableUsers) ? payload.meta.assignableUsers : []
    );

    setStatusDraft(payload.data.status);
    setAssignedToIdDraft(payload.data.assignedToId ?? "");
    setScheduledStartDraft(toDateTimeLocal(payload.data.scheduledStart));
    setScheduledEndDraft(toDateTimeLocal(payload.data.scheduledEnd));
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  async function saveLifecycleUpdates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workOrder) return;

    const payload: Record<string, unknown> = {};
    if (statusDraft !== workOrder.status) {
      payload.status = statusDraft;
    }

    if (canEditAssignment && assignedToIdDraft !== (workOrder.assignedToId ?? "")) {
      payload.assignedToId = assignedToIdDraft || null;
    }

    const scheduledStartIso = toIsoDateTime(scheduledStartDraft);
    const scheduledEndIso = toIsoDateTime(scheduledEndDraft);
    const existingScheduledStartLocal = toDateTimeLocal(workOrder.scheduledStart);
    const existingScheduledEndLocal = toDateTimeLocal(workOrder.scheduledEnd);

    if (scheduledStartDraft !== existingScheduledStartLocal) {
      payload.scheduledStart = scheduledStartIso;
    }
    if (scheduledEndDraft !== existingScheduledEndLocal) {
      payload.scheduledEnd = scheduledEndIso;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage("No lifecycle changes detected.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/work-orders/${workOrderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => null)) as
      | WorkOrderDetailResponse
      | null;

    if (!response.ok || !body?.data) {
      setErrorMessage(body?.error?.message ?? "Unable to update work order.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Work order lifecycle updated.");
    setWorkOrder(body.data);
    setAllowedTransitions(
      Array.isArray(body.meta?.allowedTransitions) ? body.meta.allowedTransitions : []
    );
    setCanUpdate(Boolean(body.meta?.canUpdate));
    setCanEditAssignment(Boolean(body.meta?.canEditAssignment));
    setAssignableUsers(
      Array.isArray(body.meta?.assignableUsers) ? body.meta.assignableUsers : []
    );

    setStatusDraft(body.data.status);
    setAssignedToIdDraft(body.data.assignedToId ?? "");
    setScheduledStartDraft(toDateTimeLocal(body.data.scheduledStart));
    setScheduledEndDraft(toDateTimeLocal(body.data.scheduledEnd));
    setIsSaving(false);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Operations</p>
          <h2 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
            Work Order Detail
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Execute lifecycle controls for scheduling, assignment, and completion using
            backend-enforced transitions.
          </p>
        </div>
        <Link
          href="/work-orders"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          Back to work orders
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {isLoading ? (
        <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-slate-500">Loading work order...</p>
        </section>
      ) : !workOrder ? (
        <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-slate-500">Work order detail is unavailable.</p>
        </section>
      ) : (
        <>
          <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  {workOrder.workOrderNumber || workOrder.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Work order ID: {workOrder.id}
                </p>
              </div>
              <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                {statusLabel(workOrder.status)}
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Customer</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {workOrder.customer.customerNumber
                    ? `${workOrder.customer.name} (${workOrder.customer.customerNumber})`
                    : workOrder.customer.name}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Site</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {workOrder.site.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {[workOrder.site.city, workOrder.site.state].filter(Boolean).join(", ") ||
                    "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Assigned</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {personLabel(workOrder.assignedTo)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Scheduled</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatDateTime(workOrder.scheduledStart)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  End {formatDateTime(workOrder.scheduledEnd)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  Estimate Linkage
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {estimateLabel(workOrder.estimate)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Tasks</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {workOrder._count.tasks}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Checklists</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {workOrder._count.checklists}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  Schedule Events
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {workOrder._count.scheduleEvents}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              Lifecycle Controls
            </h3>
            {!canUpdate ? (
              <p className="mt-3 text-sm text-slate-500">
                Lifecycle controls are read-only for your role and assignment scope.
              </p>
            ) : (
              <form onSubmit={saveLifecycleUpdates} className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Status transition</span>
                    <select
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Assigned user</span>
                    <select
                      value={assignedToIdDraft}
                      onChange={(event) => setAssignedToIdDraft(event.target.value)}
                      disabled={!canEditAssignment}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:bg-slate-50"
                    >
                      {canEditAssignment ? (
                        <>
                          <option value="">Unassigned</option>
                          {assignableUsers.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {assignableUserLabel(entry)}
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value={workOrder.assignedToId ?? ""}>
                          {personLabel(workOrder.assignedTo)}
                        </option>
                      )}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Scheduled start</span>
                    <input
                      type="datetime-local"
                      value={scheduledStartDraft}
                      onChange={(event) => setScheduledStartDraft(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Scheduled end</span>
                    <input
                      type="datetime-local"
                      value={scheduledEndDraft}
                      onChange={(event) => setScheduledEndDraft(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    />
                  </label>
                </div>
                {statusValues.length > 0 ? (
                  <p className="text-xs text-slate-500">
                    Available statuses: {statusValues.map(statusLabel).join(", ")}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save lifecycle updates"}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              Activity Log
            </h3>
            <div className="mt-4 space-y-2">
              {workOrder.activityLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No activity has been recorded yet.</p>
              ) : (
                workOrder.activityLogs.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {entry.action.replace(/\./g, " ")}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {entry.message || "No message provided."}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activityActorLabel(entry)} on {formatDateTime(entry.occurredAt)}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>

          <TasksPanel workOrderId={workOrder.id} />
          <ChecklistsPanel workOrderId={workOrder.id} />
          <div className="grid gap-6 xl:grid-cols-2">
            <NotesPanel
              entityType="work_order"
              entityId={workOrder.id}
              title="Work Order Notes"
            />
            <AttachmentsPanel
              entityType="work_order"
              entityId={workOrder.id}
              title="Work Order Attachment Metadata"
            />
          </div>
        </>
      )}
    </div>
  );
}
