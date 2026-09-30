import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getCase } from "@/lib/cases";
import { prisma } from "@/lib/db";
import { runEscalations } from "@/lib/escalation";
import { overdueSteps } from "@/lib/plan/overdue";
import { canParentSeePlan } from "@/lib/plan/mutations";
import { today } from "@/lib/time";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiUser(["parent", "curator"]);
    await runEscalations();
    const record = await getCase(id);
    const allowed =
      record && ((user.role === "parent" && record.parentId === user.id) || (user.role === "curator" && record.curatorId === user.id));
    if (!record || !allowed) {
      throw new ApiError(404, "caseNotFound");
    }
    const currentDay = await today();
    const visiblePlan = user.role === "curator" || canParentSeePlan(record) ? record.plan : null;
    const escalations = await prisma.escalationEvent.findMany({ where: { caseId: id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({
      today: currentDay,
      case: {
        id: record.id,
        childName: record.childName,
        parentName: record.parentName,
        curatorName: record.curatorName,
        status: record.status,
        facts: user.role === "curator" ? record.facts : undefined,
        plan: visiblePlan,
      },
      overdue: overdueSteps(visiblePlan, currentDay).map((item) => ({
        stepId: item.step.id,
        serviceId: item.step.serviceId,
        days: item.days,
        level: item.level,
      })),
      escalations: user.role === "curator" ? escalations : [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}
