import { NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getCase, saveCase } from "@/lib/cases";
import { loadQuestionDefs } from "@/lib/interview/questions";
import { generatePlan } from "@/lib/plan/generate";

export const maxDuration = 120;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireApiUser(["parent", "curator"]);
    const record = await getCase(id);
    const allowed =
      record && ((user.role === "parent" && record.parentId === user.id) || (user.role === "curator" && record.curatorId === user.id));
    if (!record || !allowed) {
      throw new ApiError(404, "caseNotFound");
    }
    if (record.status === "interview") {
      throw new ApiError(409, "interviewNotFinished");
    }
    if (record.status === "approved" || record.plan?.approved) {
      throw new ApiError(409, "planApprovedNoRegen");
    }
    if (user.role === "parent" && record.plan) {
      return NextResponse.json({
        status: record.status,
        generatedBy: record.plan.generatedBy,
        visibleToFamily: record.plan.visibleToFamily,
        steps: record.plan.steps.length,
      });
    }
    const visibleToFamily = user.role === "parent" ? !record.curatorId : (record.plan?.visibleToFamily ?? false);
    const plan = await generatePlan(await loadQuestionDefs(), record.facts, new Date(), visibleToFamily);
    await saveCase(record.id, { plan, status: "plan_draft" });
    if (user.role === "parent") {
      return NextResponse.json({ status: "plan_draft", generatedBy: plan.generatedBy, visibleToFamily, steps: plan.steps.length });
    }
    return NextResponse.json({ status: "plan_draft", plan });
  } catch (error) {
    return handleApiError(error);
  }
}
