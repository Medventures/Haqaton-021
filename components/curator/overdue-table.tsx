"use client";

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { EscalationBadge, StatusBadge, TrackBadge } from "@/components/badges";
import { MoveDeadlineDialog, ResolveEscalationButton, StatusSelect } from "@/components/plan/step-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateShort, formatDays } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { OverdueRow } from "@/lib/overview";
import { stepTitle } from "@/lib/plan/view";

export function OverdueTable({ rows, today }: { rows: OverdueRow[]; today: string }) {
  const { locale, t } = useI18n();
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-white p-10 text-center text-muted-foreground">
        <PartyPopper className="mx-auto mb-2 size-7 text-primary" />
        {t.curator.noOverdue}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.curator.family}</TableHead>
            <TableHead>{t.curator.step}</TableHead>
            <TableHead>{t.plan.deadlineLabel}</TableHead>
            <TableHead>{t.curator.daysOverdue}</TableHead>
            <TableHead>{t.curator.level}</TableHead>
            <TableHead className="min-w-[420px]">{t.common.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.caseId}-${row.step.id}`} className={row.level === 2 ? "bg-red-50/60" : undefined}>
              <TableCell>
                <Link href={`/curator/cases/${row.caseId}`} className="font-medium hover:text-primary">
                  {row.childName}
                </Link>
                <div className="text-xs text-muted-foreground">{row.parentName}</div>
              </TableCell>
              <TableCell className="max-w-72 whitespace-normal">
                <div className="font-medium">{stepTitle(row.step, locale)}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <TrackBadge track={row.step.track} />
                  <StatusBadge status={row.step.status} />
                </div>
              </TableCell>
              <TableCell>{formatDateShort(row.step.deadline)}</TableCell>
              <TableCell className="font-semibold text-red-700">{formatDays(row.days, locale)}</TableCell>
              <TableCell className="whitespace-normal">
                <EscalationBadge level={row.level} since={row.level === 2 ? row.level2Since : null} />
                {!row.openEscalation && row.resolvedNote ? (
                  <div className="mt-1 text-xs text-muted-foreground">{t.plan.escalationClosed(row.resolvedNote)}</div>
                ) : null}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <MoveDeadlineDialog caseId={row.caseId} step={row.step} today={today} />
                  <StatusSelect caseId={row.caseId} step={row.step} />
                  {row.openEscalation ? <ResolveEscalationButton caseId={row.caseId} stepId={row.step.id} /> : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
