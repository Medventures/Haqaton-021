import { OverdueTable } from "@/components/curator/overdue-table";
import { requirePageUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { loadCuratorOverview } from "@/lib/overview";

export default async function OverduePage() {
  const user = await requirePageUser("curator");
  const { t } = await getI18n();
  const overview = await loadCuratorOverview(user.id);
  const level2 = overview.overdueRows.filter((row) => row.level === 2).length;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.curator.overdueTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.curator.overdueSubtitle}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-red-600 px-3 py-1 font-medium text-white">{t.curator.overdueSteps(overview.overdueRows.length)}</span>
        <span className="rounded-full bg-red-700/10 px-3 py-1 font-medium text-red-800">{t.curator.escalations(level2)}</span>
      </div>
      <OverdueTable rows={overview.overdueRows} today={overview.today} />
    </div>
  );
}
