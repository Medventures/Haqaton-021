import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { LEGAL_DATE, LEGAL_DOCUMENTS, LEGAL_VERSION, type LegalDocumentId } from "@/lib/legal";

export const dynamic = "force-dynamic";

const IDS: LegalDocumentId[] = ["terms", "privacy", "curator"];

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!IDS.includes(doc as LegalDocumentId)) {
    notFound();
  }
  const [{ locale, t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const document = LEGAL_DOCUMENTS[doc as LegalDocumentId][locale];
  return (
    <AppShell user={user} width="narrow" disclaimer={false}>
      <article className="rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold">{document.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.legal.version(LEGAL_VERSION, formatDate(LEGAL_DATE, locale))}</p>
        <p className="mt-4 text-sm leading-relaxed">{document.intro}</p>
        <div className="mt-6 flex flex-col gap-6">
          {document.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-semibold">{section.heading}</h2>
              <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-foreground/85">
                {section.items.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-8 border-t pt-4 text-sm">
          <div className="mb-2 font-medium">{t.legal.otherDocuments}</div>
          <div className="flex flex-wrap gap-3">
            {IDS.filter((id) => id !== doc).map((id) => (
              <Link key={id} href={`/legal/${id}`} className="text-primary hover:underline">
                {t.legal[id]}
              </Link>
            ))}
          </div>
        </div>
      </article>
    </AppShell>
  );
}
