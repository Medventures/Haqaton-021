import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";

export default async function SpecialistJournalsPage() {
  const user = await requirePageUser("specialist");
  const [{ t }, access] = await Promise.all([
    getI18n(),
    prisma.caseSpecialistAccess.findMany({ where: { specialistId: user.id, specialist: { specialistProfile: { status: "approved" } } }, include: { case: { select: { id: true, childName: true, parent: { select: { name: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <AppShell user={user} disclaimer={false}>
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold">{t.journal.specialistFamilies}</h1><p className="mt-1 text-sm text-muted-foreground">{t.journal.specialistFamiliesHint}</p></div>
      {access.length === 0 ? <p className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground">{t.common.empty}</p> : <ul className="grid gap-3 sm:grid-cols-2">{access.map(({ case: record }) => <li key={record.id}><Link href={`/specialist/journal/${record.id}`} className="block rounded-2xl border bg-white p-5 shadow-sm hover:border-primary"><span className="font-semibold">{record.childName}</span><span className="mt-1 block text-sm text-muted-foreground">{record.parent.name}</span></Link></li>)}</ul>}
    </div>
  </AppShell>;
}
