import { Prisma } from "@prisma/client";

export const taskSelect = {
  id: true,
  workOrderId: true,
  assignedToId: true,
  assetId: true,
  templateId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  taskType: true,
  sortOrder: true,
  isRequired: true,
  dueAt: true,
  completedAt: true,
  resultNotes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

export const checklistItemSelect = {
  id: true,
  checklistId: true,
  assignedToId: true,
  title: true,
  description: true,
  isCompleted: true,
  sortOrder: true,
  isRequired: true,
  completedAt: true,
  resultNotes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ChecklistItemSelect;

export const checklistSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  workOrderId: true,
  walkthroughId: true,
  templateId: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: checklistItemSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.ChecklistSelect;

export const noteSelect = {
  id: true,
  entityType: true,
  entityId: true,
  createdById: true,
  noteType: true,
  content: true,
  isInternal: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NoteSelect;

export const attachmentSelect = {
  id: true,
  entityType: true,
  entityId: true,
  fileName: true,
  fileUrl: true,
  fileType: true,
  mimeType: true,
  fileSizeBytes: true,
  uploadedById: true,
  caption: true,
  category: true,
  sortOrder: true,
  isPrimary: true,
  createdAt: true,
} satisfies Prisma.AttachmentSelect;

export type TaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;
export type ChecklistRecord = Prisma.ChecklistGetPayload<{
  select: typeof checklistSelect;
}>;
export type ChecklistItemRecord = Prisma.ChecklistItemGetPayload<{
  select: typeof checklistItemSelect;
}>;
