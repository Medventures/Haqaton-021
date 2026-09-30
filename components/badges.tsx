"use client";

import { Siren, Star, TriangleAlert } from "lucide-react";
import type { Track } from "@/lib/catalog";
import { formatDayMonth, toDateOnly } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { CASE_STATUS_STYLE, PRIORITY_STYLE, REVIEW_STATUS_STYLE, STATUS_STYLE, TRACK_STYLE } from "@/lib/labels";
import type { DisplayStatus } from "@/lib/plan/overdue";
import type { CaseStatus, Priority } from "@/lib/plan/schema";
import { cn } from "@/lib/utils";

const base = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  const { t } = useI18n();
  const style = STATUS_STYLE[status];
  return (
    <span className={cn(base, style.badge, className)}>
      <span aria-hidden>{style.emoji}</span>
      {t.statuses[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useI18n();
  return <span className={cn(base, PRIORITY_STYLE[priority])}>{t.priorityLabel(t.priorities[priority])}</span>;
}

export function TrackBadge({ track }: { track: Track }) {
  const { t } = useI18n();
  const style = TRACK_STYLE[track];
  return <span className={cn(base, style.bg, style.text, style.border)}>{t.tracks[track]}</span>;
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const { t } = useI18n();
  return <span className={cn(base, CASE_STATUS_STYLE[status])}>{t.caseStatus[status]}</span>;
}

export function OverdueCountBadge({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <span className={cn(base, "border-red-600 bg-red-600 text-white")}>{count}</span>;
}

export function EscalationBadge({ level, since }: { level: 1 | 2; since?: string | null }) {
  const { locale, t } = useI18n();
  if (level === 2) {
    return (
      <span className={cn(base, "w-fit whitespace-normal border-red-700 bg-red-700 text-white")}>
        <Siren className="size-3 shrink-0" />
        {t.plan.escalationLevel2}
        {since ? ` · ${t.plan.escalationSince(formatDayMonth(toDateOnly(new Date(since)), locale))}` : ""}
      </span>
    );
  }
  return (
    <span className={cn(base, "border-red-200 bg-red-50 text-red-700")}>
      <TriangleAlert className="size-3" />
      {t.plan.overdueBadge}
    </span>
  );
}

export function ReviewStatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={cn(base, REVIEW_STATUS_STYLE[status] ?? REVIEW_STATUS_STYLE.pending)}>{label}</span>;
}

export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          className={cn(size === "md" ? "size-5" : "size-3.5", index <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300")}
        />
      ))}
    </span>
  );
}
