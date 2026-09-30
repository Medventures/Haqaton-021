import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { loadCuratorOverview } from "@/lib/overview";

export async function GET() {
  try {
    const user = await requireApiUser(["curator"]);
    const overview = await loadCuratorOverview(user.id);
    return NextResponse.json({
      today: overview.today,
      counts: overview.counts,
      cases: overview.summaries.map((summary) => ({
        id: summary.record.id,
        childName: summary.record.childName,
        parentName: summary.record.parentName,
        status: summary.record.status,
        progress: summary.progress,
        overdueCount: summary.overdueCount,
        maxLevel: summary.maxLevel,
      })),
      overdue: overview.overdueRows.map((row) => ({
        caseId: row.caseId,
        childName: row.childName,
        stepId: row.step.id,
        serviceId: row.step.serviceId,
        days: row.days,
        level: row.level,
        openEscalation: row.openEscalation,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
