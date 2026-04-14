"use client";

import { FormEvent, useEffect, useState } from "react";

type ChecklistItemRecord = {
  id: string;
  title: string;
  isCompleted: boolean;
  resultNotes: string | null;
};

type ChecklistRecord = {
  id: string;
  title: string;
  status: string;
  items: ChecklistItemRecord[];
};

type ChecklistsPanelProps = { workOrderId: string };

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

export default function ChecklistsPanel({ workOrderId }: ChecklistsPanelProps) {
  const [checklists, setChecklists] = useState<ChecklistRecord[]>([]);
  const [statuses, setStatuses] = useState<string[]>(["draft"]);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistStatus, setNewChecklistStatus] = useState("draft");
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setErrorMessage(null);

    const response = await fetch(`/api/work-orders/${workOrderId}/checklists`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | { data?: ChecklistRecord[]; meta?: { statuses?: string[] }; error?: { message?: string } }
      | null;

    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "Failed to load checklists.");
      setChecklists([]);
      setIsLoading(false);
      return;
    }

    const nextChecklists = Array.isArray(payload?.data) ? payload.data : [];
    const nextStatuses = payload?.meta?.statuses?.length ? payload.meta.statuses : ["draft"];
    setChecklists(nextChecklists);
    setStatuses(nextStatuses);
    setNewChecklistStatus((current) => (nextStatuses.includes(current) ? current : nextStatuses[0]));
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  async function createChecklist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newChecklistTitle.trim();
    if (!title) {
      setErrorMessage("Checklist title is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/work-orders/${workOrderId}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status: newChecklistStatus }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: ChecklistRecord; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to create checklist.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Checklist created.");
    setNewChecklistTitle("");
    await load();
    setIsSaving(false);
  }

  async function createChecklistItem(checklistId: string) {
    const title = (itemDrafts[checklistId] ?? "").trim();
    if (!title) {
      setErrorMessage("Checklist item title is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/checklists/${checklistId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: ChecklistItemRecord; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to create checklist item.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Checklist item created.");
    setItemDrafts((current) => ({ ...current, [checklistId]: "" }));
    await load();
    setIsSaving(false);
  }

  async function toggleChecklistItem(item: ChecklistItemRecord) {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/checklist-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        isCompleted: !item.isCompleted,
        completedAt: !item.isCompleted ? new Date().toISOString() : null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: ChecklistItemRecord; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to update checklist item.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage(!item.isCompleted ? "Checklist item completed." : "Checklist item reopened.");
    await load();
    setIsSaving(false);
  }

  return (
    <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <h3 className="text-xl font-semibold tracking-tight text-slate-950">Checklists</h3>
      {errorMessage ? <p className="mt-3 text-sm text-rose-700">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}

      <form onSubmit={createChecklist} className="mt-4 flex flex-wrap gap-2">
        <input value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} placeholder="Checklist title" className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        <select value={newChecklistStatus} onChange={(e) => setNewChecklistStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
        <button type="submit" disabled={isSaving || isLoading} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : "Create checklist"}</button>
      </form>

      <div className="mt-5 space-y-3">
        {isLoading ? <p className="text-sm text-slate-500">Loading checklists...</p> : checklists.length === 0 ? <p className="text-sm text-slate-500">No checklists yet.</p> : checklists.map((checklist) => (
          <div key={checklist.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{checklist.title}</p>
            <p className="mt-1 text-xs text-slate-500">{statusLabel(checklist.status)}</p>

            <div className="mt-3 space-y-2">
              {checklist.items.length === 0 ? <p className="text-xs text-slate-500">No checklist items yet.</p> : checklist.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-800">{item.title}</p>
                    <button type="button" onClick={() => void toggleChecklistItem(item)} disabled={isSaving || isLoading} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-60">{item.isCompleted ? "Completed" : "Mark complete"}</button>
                  </div>
                  {item.resultNotes ? <p className="mt-1 text-xs text-slate-500">Result: {item.resultNotes}</p> : null}
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <input value={itemDrafts[checklist.id] ?? ""} onChange={(e) => setItemDrafts((current) => ({ ...current, [checklist.id]: e.target.value }))} placeholder="New checklist item title" className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
              <button type="button" onClick={() => void createChecklistItem(checklist.id)} disabled={isSaving || isLoading} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : "Add item"}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
