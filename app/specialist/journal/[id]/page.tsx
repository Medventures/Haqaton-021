import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { JournalHistory } from "@/components/journal/journal-history";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { loadJournal } from "@/lib/journal";

export default async function SpecialistJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("specialist");
  const { id } = await params;
  const access = await prisma.caseSpecialistAccess.findFirst({ where: { caseId: id, specialistId: user.id, specialist: { specialistProfile: { status: "approved" } } }, include: { case: { select: { childName: true } } } });
  if (!access) notFound();
  const [{ t }, journal] = await Promise.all([getI18n(), loadJournal(id)]);
  return <AppShell user={user} disclaimer={false}>
    <div className="space-y-5">
      <Link href="/specialist/journal" className="text-sm text-primary hover:underline">← {t.journal.specialistFamilies}</Link>
      <div><h1 className="text-2xl font-semibold">{t.journal.title}: {access.case.childName}</h1><p className="mt-1 text-sm text-muted-foreground">{t.journal.readOnly}</p></div>
      <JournalHistory journal={journal} />
    </div>
  </AppShell>;
}
