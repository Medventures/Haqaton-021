import { redirect } from "next/navigation";
import { JournalEditor } from "@/components/journal/journal-editor";
import { JournalHistory } from "@/components/journal/journal-history";
import { JournalSharing } from "@/components/journal/journal-sharing";
import { requirePageUser } from "@/lib/auth";
import { getCaseForParent } from "@/lib/cases";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { loadJournal } from "@/lib/journal";

export default async function ParentJournalPage() {
  const user = await requirePageUser("parent");
  const record = await getCaseForParent(user.id);
  if (!record) redirect("/api/auth/logout");
  const [{ t }, journal, profiles, access] = await Promise.all([
    getI18n(),
    loadJournal(record.id),
    prisma.specialistProfile.findMany({ where: { status: "approved", user: { status: "active" } }, select: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.caseSpecialistAccess.findMany({ where: { caseId: record.id }, select: { specialist: { select: { id: true, name: true } } } }),
  ]);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">{t.journal.title}: {record.childName}</h1><p className="mt-1 text-sm text-muted-foreground">{t.journal.subtitle}</p></div>
      <JournalEditor days={journal.days} />
      <JournalHistory journal={journal} editable />
      <JournalSharing specialists={profiles.map((profile) => profile.user)} shared={access.map((entry) => entry.specialist)} />
    </div>
  );
}
