"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRole } from "@/components/providers/RoleProvider";
import { PlatformRole } from "@/types/roles";

type PersonSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type CustomerSummary = {
  id: string;
  name: string;
  customerNumber: string | null;
};

type LeadRecord = {
  id: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  serviceType: string | null;
  source: string | null;
  notes: string | null;
  status: string;
  nextActionAt: string | null;
  convertedAt: string | null;
  wonAt: string | null;
  lostAt: string | null;
  assignedToId: string | null;
  customerId: string | null;
  assignedTo: PersonSummary | null;
  customer: CustomerSummary | null;
  createdAt: string;
  updatedAt: string;
};

type LeadsResponse = {
  data?: LeadRecord[];
  meta?: {
    statuses?: string[];
  };
  error?: {
    message?: string;
  };
};

type LeadResponse = {
  data?: LeadRecord;
  error?: {
    message?: string;
  };
};

type LeadFormState = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  serviceType: string;
  source: string;
  notes: string;
};

const emptyLeadForm: LeadFormState = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  serviceType: "",
  source: "",
  notes: "",
};

const roleLeadDefaultStatus: Partial<Record<PlatformRole, string>> = {
  support: "new",
  sales: "new",
};

const roleLeadFocus: Record<PlatformRole, string> = {
  admin: "Cross-team lead oversight for intake quality and conversion traceability.",
  operations_manager:
    "Operational review of qualified leads and readiness for walkthrough handoff.",
  support: "Intake-focused view for lead triage and status progression support.",
  sales: "Pipeline-focused view for qualification, walkthrough decision, and quote progression.",
  technician:
    "Leads are intentionally hidden from technician navigation to preserve role boundaries.",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function primaryLeadTitle(lead: LeadRecord) {
  return lead.companyName || lead.contactName || "Untitled lead";
}

function toFormState(lead: LeadRecord): LeadFormState {
  return {
    companyName: lead.companyName ?? "",
    contactName: lead.contactName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    serviceType: lead.serviceType ?? "",
    source: lead.source ?? "",
    notes: lead.notes ?? "",
  };
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

function customerLabel(customer: CustomerSummary | null) {
  if (!customer) return "Not converted";
  return customer.customerNumber
    ? `${customer.name} (${customer.customerNumber})`
    : customer.name;
}

export default function LeadsWorkspace() {
  const { role } = useRole();

  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>(["new"]);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [createForm, setCreateForm] = useState<LeadFormState>(emptyLeadForm);
  const [createStatus, setCreateStatus] = useState("new");
  const [editForm, setEditForm] = useState<LeadFormState>(emptyLeadForm);
  const [statusDraft, setStatusDraft] = useState("new");
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatusFilter(roleLeadDefaultStatus[role] ?? "");
  }, [role]);

  async function loadLeads(preferredLeadId?: string | null) {
    setIsLoadingLeads(true);
    setErrorMessage(null);

    try {
      const query = new URLSearchParams();
      if (statusFilter) {
        query.set("status", statusFilter);
      }

      const queryString = query.toString();
      const path = queryString ? `/api/leads?${queryString}` : "/api/leads";
      const response = await fetch(path, { cache: "no-store" });
      const payload = (await response.json()) as LeadsResponse;

      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to load leads.");
      }

      const nextLeads = Array.isArray(payload.data) ? payload.data : [];
      const nextStatuses =
        Array.isArray(payload.meta?.statuses) && payload.meta.statuses.length > 0
          ? payload.meta.statuses
          : ["new"];

      setLeads(nextLeads);
      setStatusOptions(nextStatuses);
      setCreateStatus((current) =>
        nextStatuses.includes(current) ? current : nextStatuses[0]
      );

      setSelectedLeadId((current) => {
        const desired = preferredLeadId ?? current;
        if (desired && nextLeads.some((lead) => lead.id === desired)) {
          return desired;
        }
        return nextLeads[0]?.id ?? null;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load leads.";
      setErrorMessage(message);
      setLeads([]);
      setSelectedLeadId(null);
      setSelectedLead(null);
    } finally {
      setIsLoadingLeads(false);
    }
  }

  async function loadLeadDetail(leadId: string) {
    setIsLoadingDetail(true);

    try {
      const response = await fetch(`/api/leads/${leadId}`, { cache: "no-store" });
      const payload = (await response.json()) as LeadResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Failed to load lead details.");
      }

      setSelectedLead(payload.data);
      setEditForm(toFormState(payload.data));
      setStatusDraft(payload.data.status);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load lead details.";
      setErrorMessage(message);
      setSelectedLead(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  useEffect(() => {
    void loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null);
      setEditForm(emptyLeadForm);
      return;
    }

    void loadLeadDetail(selectedLeadId);
  }, [selectedLeadId]);

  async function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...createForm,
        status: createStatus,
      }),
    });

    const payload = (await response.json().catch(() => null)) as LeadResponse | null;
    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to create lead.");
      setIsCreating(false);
      return;
    }

    const createdLeadId = payload.data.id;
    setCreateForm(emptyLeadForm);
    setSuccessMessage("Lead created successfully.");
    await loadLeads(createdLeadId);
    setIsCreating(false);
  }

  async function handleSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLeadId) return;

    setIsSavingDetails(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/leads/${selectedLeadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    const payload = (await response.json().catch(() => null)) as LeadResponse | null;
    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to update lead details.");
      setIsSavingDetails(false);
      return;
    }

    setSuccessMessage("Lead details updated.");
    setSelectedLead(payload.data);
    setStatusDraft(payload.data.status);
    setLeads((current) =>
      current.map((lead) => (lead.id === payload.data?.id ? payload.data : lead))
    );
    setIsSavingDetails(false);
  }

  async function handleStatusChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLeadId) return;

    setIsSavingStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/leads/${selectedLeadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusDraft }),
    });

    const payload = (await response.json().catch(() => null)) as LeadResponse | null;
    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to change lead status.");
      setIsSavingStatus(false);
      return;
    }

    setSuccessMessage("Lead status updated.");
    setSelectedLead(payload.data);
    setLeads((current) =>
      current.map((lead) => (lead.id === payload.data?.id ? payload.data : lead))
    );
    setIsSavingStatus(false);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-500">Pipeline</p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">Leads</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Manage intake opportunities, qualification status, and conversion traceability
          into customer and operational workflows.
        </p>
        <p className="mt-2 text-sm text-slate-500">{roleLeadFocus[role]}</p>
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

      <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">
            Lead intake queue
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
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">Create lead</h3>

          <form onSubmit={handleCreateLead} className="mt-5 grid gap-3 md:grid-cols-2">
            <input
              value={createForm.companyName}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  companyName: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              placeholder="Company name"
            />
            <input
              value={createForm.contactName}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  contactName: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              placeholder="Contact name"
            />
            <input
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, email: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              placeholder="Email"
            />
            <input
              value={createForm.phone}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, phone: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              placeholder="Phone"
            />
            <input
              value={createForm.serviceType}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  serviceType: event.target.value,
                }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              placeholder="Service type"
            />
            <input
              value={createForm.source}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, source: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              placeholder="Source"
            />
            <textarea
              value={createForm.notes}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, notes: event.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 md:col-span-2"
              placeholder="Notes"
              rows={3}
            />
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <select
                value={createStatus}
                onChange={(event) => setCreateStatus(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create lead"}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="text-base font-semibold text-slate-900">Lead list</h4>

            {isLoadingLeads ? (
              <p className="mt-3 text-sm text-slate-500">Loading leads...</p>
            ) : leads.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No leads match the current filter.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {leads.map((lead) => {
                  const isActive = lead.id === selectedLeadId;

                  return (
                    <li key={lead.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <p className="text-sm font-semibold">{primaryLeadTitle(lead)}</p>
                        <p
                          className={`mt-1 text-xs ${
                            isActive ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          {lead.contactName || "No contact name"} - {statusLabel(lead.status)}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            isActive ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          Assignment: {personLabel(lead.assignedTo)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">Lead details</h3>

          {!selectedLeadId ? (
            <p className="mt-4 text-sm text-slate-500">
              Select a lead to view details and update status.
            </p>
          ) : isLoadingDetail ? (
            <p className="mt-4 text-sm text-slate-500">Loading lead details...</p>
          ) : !selectedLead ? (
            <p className="mt-4 text-sm text-slate-500">Lead details could not be loaded.</p>
          ) : (
            <div className="mt-4 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {primaryLeadTitle(selectedLead)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Created {formatDateTime(selectedLead.createdAt)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Updated {formatDateTime(selectedLead.updatedAt)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Assignment: {personLabel(selectedLead.assignedTo)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Customer link: {customerLabel(selectedLead.customer)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Next action: {formatDateTime(selectedLead.nextActionAt)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Converted: {formatDateTime(selectedLead.convertedAt)}
                </p>
              </div>

              <form onSubmit={handleStatusChange} className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Status
                </label>
                <div className="flex items-center gap-2">
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
                  <button
                    type="submit"
                    disabled={isSavingStatus}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isSavingStatus ? "Saving..." : "Update"}
                  </button>
                </div>
              </form>

              <form onSubmit={handleSaveDetails} className="space-y-3">
                <input
                  value={editForm.companyName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Company name"
                />
                <input
                  value={editForm.contactName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      contactName: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Contact name"
                />
                <input
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Email"
                />
                <input
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Phone"
                />
                <input
                  value={editForm.serviceType}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      serviceType: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Service type"
                />
                <input
                  value={editForm.source}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, source: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Source"
                />
                <textarea
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Notes"
                  rows={4}
                />
                <button
                  type="submit"
                  disabled={isSavingDetails}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isSavingDetails ? "Saving..." : "Save details"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
