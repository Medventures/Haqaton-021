import type { StoredFile } from "@prisma/client";
import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { FileView } from "@/lib/files-types";

export type { FileView };

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const CASE_FILE_CATEGORIES = ["medical", "education", "social", "identity", "photo", "other"] as const;
export const SPECIALIST_FILE_CATEGORIES = ["diploma", "certificate", "license", "photo", "other"] as const;

export type FileCategory = (typeof CASE_FILE_CATEGORIES)[number] | (typeof SPECIALIST_FILE_CATEGORIES)[number];

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.oasis.opendocument.text": "odt",
  "text/plain": "txt",
};

const EXTENSION_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(ALLOWED_TYPES).map(([mime, extension]) => [extension, mime]),
);

export function resolveMimeType(file: File): string | null {
  if (ALLOWED_TYPES[file.type]) {
    return file.type;
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExtension = extension === "jpeg" ? "image/jpeg" : EXTENSION_TYPES[extension];
  return byExtension ?? null;
}

export function toFileView(
  file: Pick<StoredFile, "id" | "title" | "fileName" | "mimeType" | "size" | "category" | "documentId" | "createdAt" | "uploaderId">,
  uploaderName: string,
  user: CurrentUser,
): FileView {
  return {
    id: file.id,
    title: file.title,
    fileName: file.fileName,
    mimeType: file.mimeType,
    size: file.size,
    category: file.category,
    documentId: file.documentId,
    uploaderName,
    createdAt: file.createdAt.toISOString(),
    canDelete: file.uploaderId === user.id || user.role === "parent",
  };
}

export async function assertCaseFileAccess(user: CurrentUser, caseId: string): Promise<void> {
  const record = await prisma.case.findUnique({ where: { id: caseId }, select: { parentId: true, curatorId: true } });
  const allowed =
    record && ((user.role === "parent" && record.parentId === user.id) || (user.role === "curator" && record.curatorId === user.id));
  if (!allowed) {
    throw new ApiError(404, "caseNotFound");
  }
}

export async function assertFileAccess(user: CurrentUser, file: Pick<StoredFile, "caseId" | "specialistProfileId">): Promise<void> {
  if (file.caseId) {
    await assertCaseFileAccess(user, file.caseId);
    return;
  }
  if (file.specialistProfileId) {
    if (user.role === "commission" || user.role === "admin") {
      return;
    }
    const profile = await prisma.specialistProfile.findUnique({ where: { id: file.specialistProfileId }, select: { userId: true } });
    if (profile?.userId === user.id) {
      return;
    }
  }
  throw new ApiError(404, "notFound");
}

export const fileSelect = {
  id: true,
  title: true,
  fileName: true,
  mimeType: true,
  size: true,
  category: true,
  documentId: true,
  createdAt: true,
  uploaderId: true,
  uploader: { select: { name: true } },
} as const;
