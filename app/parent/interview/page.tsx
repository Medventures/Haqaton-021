import { redirect } from "next/navigation";
import { InterviewChat } from "@/components/parent/interview-chat";
import { requirePageUser } from "@/lib/auth";
import { getCaseForParent } from "@/lib/cases";
import { getLocale } from "@/lib/i18n/server";
import { ensureInterviewStarted, toInterviewState } from "@/lib/interview/engine";

export const maxDuration = 60;

export default async function InterviewPage() {
  const user = await requirePageUser("parent");
  const record = await getCaseForParent(user.id);
  if (!record) {
    redirect("/api/auth/logout");
  }
  if (record.status !== "interview") {
    redirect("/parent");
  }
  const started = await ensureInterviewStarted(record, await getLocale());
  return <InterviewChat initialState={await toInterviewState(started)} />;
}
