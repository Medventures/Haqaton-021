import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/lib/auth";
import { getCaseForParent, type CaseRecord } from "@/lib/cases";

export async function requireParentCase(user: CurrentUser): Promise<CaseRecord> {
  const record = await getCaseForParent(user.id);
  if (!record) {
    throw new ApiError(404, "caseNotFound");
  }
  return record;
}
