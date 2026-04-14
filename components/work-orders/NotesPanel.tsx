"use client";

import { FormEvent, useEffect, useState } from "react";

type NoteRecord = {
  id: string;
  createdById: string;
  noteType: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
};

type NotesPanelProps = {
  entityType: "work_order" | "walkthrough";
  entityId: string;
  title: string;
};

const noteTypeOptions = ["general", "handoff", "issue", "resolution", "observation"];

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function NotesPanel({ entityType, entityId, title }: NotesPanelProps) {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [noteType, setNoteType] = useState("general");
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setErrorMessage(null);

    const query = new URLSearchParams({ entityType, entityId });
    const response = await fetch(`/api/notes?${query.toString()}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | { data?: NoteRecord[]; error?: { message?: string } }
      | null;

    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "Failed to load notes.");
      setNotes([]);
      setIsLoading(false);
      return;
    }

    setNotes(Array.isArray(payload?.data) ? payload.data : []);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setErrorMessage("Note content is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, entityId, noteType, content: content.trim(), isInternal }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: NoteRecord; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to add note.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Note added.");
    setContent("");
    await load();
    setIsSaving(false);
  }

  return (
    <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
      {errorMessage ? <p className="mt-3 text-sm text-rose-700">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}

      <form onSubmit={addNote} className="mt-4 space-y-3">
        <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">{noteTypeOptions.map((entry) => <option key={entry} value={entry}>{statusLabel(entry)}</option>)}</select>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Note content" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />Internal note</label>
        <button type="submit" disabled={isSaving || isLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : "Add note"}</button>
      </form>

      <div className="mt-6 space-y-2">
        {isLoading ? <p className="text-sm text-slate-500">Loading notes...</p> : notes.length === 0 ? <p className="text-sm text-slate-500">No notes yet.</p> : notes.map((note) => (
          <div key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{statusLabel(note.noteType)} - {note.isInternal ? "internal" : "public"}</p>
            <p className="mt-1 text-sm text-slate-800">{note.content}</p>
            <p className="mt-1 text-xs text-slate-500">By {note.createdById} on {formatDateTime(note.createdAt)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
