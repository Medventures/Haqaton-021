import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getDocument } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import {
  CASE_FILE_CATEGORIES,
  MAX_FILE_SIZE,
  SPECIALIST_FILE_CATEGORIES,
  assertCaseFileAccess,
  fileSelect,
  resolveMimeType,
  toFileView,
} from "@/lib/files";
import { markPlanDocumentsReady } from "@/lib/plan/mutations";

export const maxDuration = 60;

async function ownProfileId(userId: string): Promise<string> {
  const profile = await prisma.specialistProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) {
    throw new ApiError(404, "notFound");
  }
  return profile.id;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser(["parent", "curator", "specialist", "commission"]);
    const caseId = request.nextUrl.searchParams.get("caseId");
    const specialistId = request.nextUrl.searchParams.get("specialistId");
    let where: { caseId?: string; specialistProfileId?: string };
    if (caseId) {
      await assertCaseFileAccess(user, caseId);
      where = { caseId };
    } else if (user.role === "specialist") {
      where = { specialistProfileId: await ownProfileId(user.id) };
    } else if (specialistId && user.role === "commission") {
      where = { specialistProfileId: specialistId };
    } else {
      throw new ApiError(400, "badRequest");
    }
    const files = await prisma.storedFile.findMany({ where, select: fileSelect, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ files: files.map((file) => toFileView(file, file.uploader.name, user)) });
  } catch (error) {
    return handleApiError(error);
  }
}

const metaSchema = z.object({
  caseId: z.string().min(1).nullable(),
  category: z.string().min(1),
  title: z.string().trim().max(160),
  documentId: z.string().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(["parent", "curator", "specialist"]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "fileRequired");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError(413, "fileTooLarge");
    }
    const mimeType = resolveMimeType(file);
    if (!mimeType) {
      throw new ApiError(415, "fileType");
    }
    const meta = metaSchema.parse({
      caseId: (form.get("caseId") as string | null) || null,
      category: form.get("category") ?? "other",
      title: (form.get("title") as string | null) ?? "",
      documentId: (form.get("documentId") as string | null) || null,
    });
    const data = new Uint8Array(await file.arrayBuffer());
    const title = meta.title || file.name;
    if (user.role === "specialist") {
      if (!(SPECIALIST_FILE_CATEGORIES as readonly string[]).includes(meta.category)) {
        throw new ApiError(400, "badRequest");
      }
      const specialistProfileId = await ownProfileId(user.id);
      const created = await prisma.storedFile.create({
        data: { specialistProfileId, uploaderId: user.id, category: meta.category, title, fileName: file.name, mimeType, size: file.size, data },
        select: fileSelect,
      });
      return NextResponse.json({ file: toFileView(created, created.uploader.name, user) });
    }
    let caseId = meta.caseId;
    if (user.role === "parent") {
      const own = await prisma.case.findFirst({ where: { parentId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true } });
      caseId = own?.id ?? null;
    }
    if (!caseId) {
      throw new ApiError(404, "caseNotFound");
    }
    await assertCaseFileAccess(user, caseId);
    if (!(CASE_FILE_CATEGORIES as readonly string[]).includes(meta.category)) {
      throw new ApiError(400, "badRequest");
    }
    const documentId = meta.documentId && getDocument(meta.documentId) ? meta.documentId : null;
    const created = await prisma.storedFile.create({
      data: { caseId, uploaderId: user.id, category: meta.category, documentId, title, fileName: file.name, mimeType, size: file.size, data },
      select: fileSelect,
    });
    if (documentId) {
      await markPlanDocumentsReady(caseId, documentId, user.role === "curator" ? "curator" : "parent", title);
    }
    return NextResponse.json({ file: toFileView(created, created.uploader.name, user) });
  } catch (error) {
    return handleApiError(error);
  }
}
