"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TaskRecord = {
  id: string;
  title: string;
  status: string;
  assignedToId: string | null;
  sortOrder: number;
  dueAt: string | null;
  resultNotes: string | null;
};

type TaskForm = {
  title: string;
  status: string;
  sortOrder: string;
  dueAt: string;
  resultNotes: string;
};

const emptyTaskForm: TaskForm = {
  title: "",
  status: "todo",
  sortOrder: "0",
  dueAt: "",
  resultNotes: "",
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
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

function toTaskForm(task: TaskRecord): TaskForm {
  return {
    title: task.title,
    status: task.status,
    sortOrder: String(task.sortOrder),
    dueAt: toDateTimeLocal(task.dueAt),
    resultNotes: task.resultNotes ?? "",
  };
}

function taskPayload(form: TaskForm) {
  const sortOrder = Number(form.sortOrder);
  return {
    title: form.title.trim(),
    status: form.status,
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
    dueAt: toIsoDateTime(form.dueAt),
    resultNotes: form.resultNotes.trim() || null,
  };
}

type TasksPanelProps = { workOrderId: string };

export default function TasksPanel({ workOrderId }: TasksPanelProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [statuses, setStatuses] = useState<string[]>(["todo"]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<TaskForm>(emptyTaskForm);
  const [editForm, setEditForm] = useState<TaskForm>(emptyTaskForm);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  async function load(preferredTaskId?: string | null) {
    setIsLoading(true);
    setErrorMessage(null);

    const response = await fetch(`/api/work-orders/${workOrderId}/tasks`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | { data?: TaskRecord[]; meta?: { statuses?: string[] }; error?: { message?: string } }
      | null;

    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "Failed to load tasks.");
      setTasks([]);
      setSelectedTaskId(null);
      setIsLoading(false);
      return;
    }

    const nextTasks = Array.isArray(payload?.data) ? payload.data : [];
    const nextStatuses = payload?.meta?.statuses?.length ? payload.meta.statuses : ["todo"];

    setTasks(nextTasks);
    setStatuses(nextStatuses);
    setCreateForm((current) => ({
      ...current,
      status: nextStatuses.includes(current.status) ? current.status : nextStatuses[0],
    }));

    setSelectedTaskId(preferredTaskId ?? nextTasks[0]?.id ?? null);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId]);

  useEffect(() => {
    setEditForm(selectedTask ? toTaskForm(selectedTask) : emptyTaskForm);
  }, [selectedTask]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createForm.title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/work-orders/${workOrderId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskPayload(createForm)),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: TaskRecord; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to create task.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Task created.");
    setCreateForm((current) => ({ ...emptyTaskForm, status: current.status }));
    await load(payload.data.id);
    setIsSaving(false);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTaskId || !editForm.title.trim()) {
      setErrorMessage("Select a task and provide title.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/work-orders/${workOrderId}/tasks/${selectedTaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskPayload(editForm)),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: TaskRecord; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to update task.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Task updated.");
    await load(payload.data.id);
    setIsSaving(false);
  }

  async function completeTask(task: TaskRecord) {
    if (task.status === "completed") return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/work-orders/${workOrderId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: task.title, status: "completed", completedAt: new Date().toISOString() }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: TaskRecord; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to complete task.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Task marked completed.");
    await load(payload.data.id);
    setIsSaving(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
      <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">Tasks</h3>
        {errorMessage ? <p className="mt-3 text-sm text-rose-700">{errorMessage}</p> : null}
        {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}

        <form onSubmit={createTask} className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={createForm.title} onChange={(e) => setCreateForm((c) => ({ ...c, title: e.target.value }))} placeholder="Task title" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
          <select value={createForm.status} onChange={(e) => setCreateForm((c) => ({ ...c, status: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
          <input value={createForm.sortOrder} onChange={(e) => setCreateForm((c) => ({ ...c, sortOrder: e.target.value }))} placeholder="Sort order" inputMode="numeric" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
          <input type="datetime-local" value={createForm.dueAt} onChange={(e) => setCreateForm((c) => ({ ...c, dueAt: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
          <textarea value={createForm.resultNotes} onChange={(e) => setCreateForm((c) => ({ ...c, resultNotes: e.target.value }))} rows={2} placeholder="Result notes" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
          <div className="md:col-span-2"><button type="submit" disabled={isSaving || isLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : "Create task"}</button></div>
        </form>

        <div className="mt-6 space-y-2">
          {isLoading ? <p className="text-sm text-slate-500">Loading tasks...</p> : tasks.length === 0 ? <p className="text-sm text-slate-500">No tasks yet.</p> : tasks.map((task) => (
            <div key={task.id} className={`rounded-xl border px-3 py-2 ${selectedTaskId === task.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
              <button type="button" onClick={() => setSelectedTaskId(task.id)} className="w-full text-left">
                <p className="text-sm font-semibold">{task.title}</p>
                <p className={`mt-1 text-xs ${selectedTaskId === task.id ? "text-slate-200" : "text-slate-500"}`}>{statusLabel(task.status)}</p>
              </button>
              <button type="button" onClick={() => void completeTask(task)} disabled={isSaving || task.status === "completed"} className="mt-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-60">{task.status === "completed" ? "Completed" : "Mark completed"}</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">Task Editor</h3>
        {!selectedTask ? <p className="mt-3 text-sm text-slate-500">Select a task to update title, status, ordering, due date, and result notes.</p> : (
          <form onSubmit={saveTask} className="mt-4 space-y-3">
            <input value={editForm.title} onChange={(e) => setEditForm((c) => ({ ...c, title: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
            <select value={editForm.status} onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
            <input value={editForm.sortOrder} onChange={(e) => setEditForm((c) => ({ ...c, sortOrder: e.target.value }))} inputMode="numeric" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
            <input type="datetime-local" value={editForm.dueAt} onChange={(e) => setEditForm((c) => ({ ...c, dueAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
            <textarea value={editForm.resultNotes} onChange={(e) => setEditForm((c) => ({ ...c, resultNotes: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
            <button type="submit" disabled={isSaving || isLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save task"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
