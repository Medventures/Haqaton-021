import Link from "next/link";
import { ClipboardList, Hourglass, TriangleAlert, UsersRound } from "lucide-react";
import { CaseStatusBadge, EscalationBadge, OverdueCountBadge } from "@/components/badges";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageUser } from "@/lib/auth";
import { formatDate, formatDateTime, toDateOnly } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { loadCuratorOverview } from "@/lib/overview";
import { cn } from "@/lib/utils";

export default async function CuratorDashboard({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requirePageUser("curator");
  const [{ locale, t }, { filter = "all" }] = await Promise.all([getI18n(), searchParams]);
  const overview = await loadCuratorOverview(user.id);
  const rows = overview.summaries.filter((summary) => {
    if (filter === "review") {
      return summary.record.status === "plan_draft";
    }
    if (filter === "overdue") {
      return summary.overdueCount > 0;
    }
    return true;
  });
  const counters = [
    { label: t.curator.total, value: overview.counts.total, icon: UsersRound, tone: "text-primary bg-primary/10" },
    { label: t.curator.review, value: overview.counts.review, icon: Hourglass, tone: "text-amber-700 bg-amber-100" },
    { label: t.curator.withOverdue, value: overview.counts.withOverdue, icon: TriangleAlert, tone: "text-red-700 bg-red-100" },
  ];
  const filters = [
    { key: "all", label: t.curator.filterAll },
    { key: "review", label: t.curator.review },
    { key: "overdue", label: t.curator.withOverdue },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.curator.familiesTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.curator.familiesSubtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {counters.map((counter) => (
          <div key={counter.label} className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
            <span className={cn("flex size-11 items-center justify-center rounded-lg", counter.tone)}>
              <counter.icon className="size-5" />
            </span>
            <div>
              <div className="text-2xl font-semibold">{counter.value}</div>
              <div className="text-sm text-muted-foreground">{counter.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link
            key={item.key}
            href={item.key === "all" ? "/curator" : `/curator?filter=${item.key}`}
            className={cn(
              "inline-flex h-9 items-center rounded-full border bg-white px-4 text-sm font-medium hover:bg-muted",
              filter === item.key && "border-primary bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.curator.child}</TableHead>
              <TableHead>{t.curator.parent}</TableHead>
              <TableHead>{t.curator.caseStatus}</TableHead>
              <TableHead className="w-44">{t.curator.progress}</TableHead>
              <TableHead>{t.curator.overdue}</TableHead>
              <TableHead>{t.curator.updated}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-2 size-6" />
                  {t.common.empty}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ record, progress, overdueCount, maxLevel, subscriptionEndsAt }) => (
                <TableRow key={record.id} className="relative">
                  <TableCell className="font-medium">
                    <Link href={`/curator/cases/${record.id}`} className="after:absolute after:inset-0 hover:text-primary">
                      {record.childName}
                    </Link>
                    {subscriptionEndsAt ? (
                      <div className="text-xs font-normal text-muted-foreground">
                        {t.curator.subscriptionUntil(formatDate(toDateOnly(new Date(subscriptionEndsAt)), locale))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>{record.parentName}</TableCell>
                  <TableCell>
                    <CaseStatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>
                    {progress.total > 0 ? (
                      <div className="flex items-center gap-2">
                        <Progress value={(progress.done / progress.total) * 100} className="h-1.5 w-20" />
                        <span className="text-sm text-muted-foreground">{t.common.ofTotal(progress.done, progress.total)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <OverdueCountBadge count={overdueCount} />
                      {maxLevel === 2 ? <EscalationBadge level={2} /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(record.updatedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
