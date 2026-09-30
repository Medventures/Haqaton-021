import { NextResponse, type NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertFileAccess } from "@/lib/files";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiUser(["parent", "curator", "specialist", "commission", "admin"]);
    const file = await prisma.storedFile.findUnique({ where: { id } });
    if (!file) {
      throw new ApiError(404, "notFound");
    }
    await assertFileAccess(user, file);
    const disposition = request.nextUrl.searchParams.get("download") ? "attachment" : "inline";
    return new NextResponse(Buffer.from(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiUser(["parent", "curator", "specialist"]);
    const file = await prisma.storedFile.findUnique({ where: { id }, select: { caseId: true, specialistProfileId: true, uploaderId: true } });
    if (!file) {
      throw new ApiError(404, "notFound");
    }
    await assertFileAccess(user, file);
    if (!(file.uploaderId === user.id || user.role === "parent")) {
      throw new ApiError(403, "forbidden");
    }
    await prisma.storedFile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
