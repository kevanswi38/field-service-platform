"use client";

import { FormEvent, useEffect, useState } from "react";

type AttachmentRecord = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: number;
};

type AttachmentsPanelProps = {
  entityType: "work_order" | "walkthrough";
  entityId: string;
  title: string;
};

export default function AttachmentsPanel({ entityType, entityId, title }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [draft, setDraft] = useState({
    fileName: "",
    fileUrl: "",
    fileType: "",
    mimeType: "",
    fileSizeBytes: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setErrorMessage(null);

    const query = new URLSearchParams({ entityType, entityId });
    const response = await fetch(`/api/attachments?${query.toString()}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as
      | { data?: AttachmentRecord[]; error?: { message?: string } }
      | null;

    if (!response.ok) {
      setErrorMessage(payload?.error?.message ?? "Failed to load attachments.");
      setAttachments([]);
      setIsLoading(false);
      return;
    }

    setAttachments(Array.isArray(payload?.data) ? payload.data : []);
    setIsLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function addAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fileSizeBytes = Number(draft.fileSizeBytes);
    if (!draft.fileName.trim() || !draft.fileUrl.trim() || !draft.fileType.trim() || !draft.mimeType.trim()) {
      setErrorMessage("Attachment metadata requires file name, URL, file type, and MIME type.");
      return;
    }

    if (!Number.isInteger(fileSizeBytes) || fileSizeBytes < 0) {
      setErrorMessage("Attachment file size must be a non-negative integer.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const response = await fetch("/api/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        fileName: draft.fileName.trim(),
        fileUrl: draft.fileUrl.trim(),
        fileType: draft.fileType.trim(),
        mimeType: draft.mimeType.trim(),
        fileSizeBytes,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { data?: AttachmentRecord; error?: { message?: string } }
      | null;

    if (!response.ok || !payload?.data) {
      setErrorMessage(payload?.error?.message ?? "Unable to add attachment metadata.");
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Attachment metadata added.");
    setDraft({ fileName: "", fileUrl: "", fileType: "", mimeType: "", fileSizeBytes: "" });
    await load();
    setIsSaving(false);
  }

  return (
    <section className="rounded-[30px] border border-white/60 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
      {errorMessage ? <p className="mt-3 text-sm text-rose-700">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-3 text-sm text-emerald-700">{successMessage}</p> : null}

      <form onSubmit={addAttachment} className="mt-4 grid gap-3 md:grid-cols-2">
        <input value={draft.fileName} onChange={(e) => setDraft((c) => ({ ...c, fileName: e.target.value }))} placeholder="File name" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        <input value={draft.fileUrl} onChange={(e) => setDraft((c) => ({ ...c, fileUrl: e.target.value }))} placeholder="File URL" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        <input value={draft.fileType} onChange={(e) => setDraft((c) => ({ ...c, fileType: e.target.value }))} placeholder="File type" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        <input value={draft.mimeType} onChange={(e) => setDraft((c) => ({ ...c, mimeType: e.target.value }))} placeholder="MIME type" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        <input value={draft.fileSizeBytes} onChange={(e) => setDraft((c) => ({ ...c, fileSizeBytes: e.target.value }))} placeholder="File size bytes" inputMode="numeric" className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        <div className="md:col-span-2"><button type="submit" disabled={isSaving || isLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{isSaving ? "Saving..." : "Add attachment metadata"}</button></div>
      </form>

      <div className="mt-6 space-y-2">
        {isLoading ? <p className="text-sm text-slate-500">Loading attachments...</p> : attachments.length === 0 ? <p className="text-sm text-slate-500">No attachment metadata yet.</p> : attachments.map((attachment) => (
          <div key={attachment.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-sm font-medium text-slate-900">{attachment.fileName}</p>
            <p className="mt-1 text-xs text-slate-500">{attachment.mimeType} - {attachment.fileSizeBytes} bytes</p>
            <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-sky-700 underline">{attachment.fileUrl}</a>
          </div>
        ))}
      </div>
    </section>
  );
}
