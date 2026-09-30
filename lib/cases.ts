import type { Case, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sanitizeFacts, type Facts } from "@/lib/interview/facts";
import { interviewSchema, type InterviewTurn } from "@/lib/interview/turns";
import { casePlanSchema, CASE_STATUSES, type CasePlan, type CaseStatus } from "@/lib/plan/schema";

export type CaseRecord = {
  id: string;
  parentId: string;
  curatorId: string | null;
  childName: string;
  status: CaseStatus;
  facts: Facts;
  interview: InterviewTurn[];
  plan: CasePlan | null;
  createdAt: Date;
  updatedAt: Date;
  parentName: string;
  curatorName: string | null;
};

type CaseRow = Case & { parent: User; curator: User | null };

function safeJson(value: string | null): unknown {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function parseCaseRow(row: CaseRow): CaseRecord {
  const interview = interviewSchema.safeParse(safeJson(row.interview));
  const plan = row.plan ? casePlanSchema.safeParse(safeJson(row.plan)) : null;
  if (plan && !plan.success) {
    console.error(`План кейса ${row.id} не прошёл валидацию`, plan.error.issues.slice(0, 3));
  }
  const factsRaw = safeJson(row.facts);
  return {
    id: row.id,
    parentId: row.parentId,
    curatorId: row.curatorId,
    childName: row.childName,
    status: (CASE_STATUSES as readonly string[]).includes(row.status) ? (row.status as CaseStatus) : "interview",
    facts: factsRaw && typeof factsRaw === "object" ? sanitizeFacts(factsRaw as Record<string, unknown>) : {},
    interview: interview.success ? interview.data : [],
    plan: plan && plan.success ? plan.data : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    parentName: row.parent.name,
    curatorName: row.curator?.name ?? null,
  };
}

const include = { parent: true, curator: true } as const;

export async function getCase(id: string): Promise<CaseRecord | null> {
  const row = await prisma.case.findUnique({ where: { id }, include });
  return row ? parseCaseRow(row) : null;
}

export async function getCaseForParent(parentId: string): Promise<CaseRecord | null> {
  const row = await prisma.case.findFirst({ where: { parentId }, orderBy: { createdAt: "desc" }, include });
  return row ? parseCaseRow(row) : null;
}

export async function listCases(): Promise<CaseRecord[]> {
  const rows = await prisma.case.findMany({ include, orderBy: { updatedAt: "desc" } });
  return rows.map(parseCaseRow);
}

export async function saveCase(
  id: string,
  data: { status?: CaseStatus; facts?: Facts; interview?: InterviewTurn[]; plan?: CasePlan | null },
): Promise<void> {
  await prisma.case.update({
    where: { id },
    data: {
      status: data.status,
      facts: data.facts === undefined ? undefined : JSON.stringify(data.facts),
      interview: data.interview === undefined ? undefined : JSON.stringify(interviewSchema.parse(data.interview)),
      plan: data.plan === undefined ? undefined : data.plan === null ? null : JSON.stringify(casePlanSchema.parse(data.plan)),
    },
  });
}
