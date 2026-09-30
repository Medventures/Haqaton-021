import { AppShell } from "@/components/app-shell";
import { QuestionsManager } from "@/components/admin/questions-manager";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { loadQuestionDefs } from "@/lib/interview/questions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requirePageUser("admin");
  const { t } = await getI18n();
  const [defs, users, cases, specialists, subscriptions] = await Promise.all([
    loadQuestionDefs(),
    prisma.user.count(),
    prisma.case.count(),
    prisma.specialistProfile.count({ where: { status: "approved" } }),
    prisma.subscription.count({ where: { status: "active", endsAt: { gt: new Date() } } }),
  ]);
  const stats = [
    { label: t.admin.stats.users, value: users },
    { label: t.admin.stats.cases, value: cases },
    { label: t.admin.stats.specialists, value: specialists },
    { label: t.admin.stats.subscriptions, value: subscriptions },
  ];
  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">{t.admin.title}</h1>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-2xl font-semibold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold">{t.admin.questionsTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.admin.questionsSubtitle}</p>
          </div>
          <QuestionsManager
            questions={defs.map((def) => ({
              id: def.id,
              builtIn: def.builtIn,
              kind: def.kind,
              required: def.required,
              active: def.active,
              questionRu: def.question.ru,
              questionKk: def.question.kk,
              options: def.options.map((option) => ({ value: option.value, labelRu: option.label.ru, labelKk: option.label.kk })),
            }))}
          />
        </section>
      </div>
    </AppShell>
  );
}
