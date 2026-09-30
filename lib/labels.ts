import type { Track } from "@/lib/catalog";
import type { EventType } from "@/lib/calendar-types";
import type { DisplayStatus } from "@/lib/plan/overdue";
import type { CaseStatus, Priority } from "@/lib/plan/schema";

export const STATUS_STYLE: Record<DisplayStatus, { emoji: string; badge: string; dot: string }> = {
  not_started: { emoji: "⚪", badge: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-300" },
  in_progress: { emoji: "🟡", badge: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-400" },
  done: { emoji: "🟢", badge: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  blocked: { emoji: "⛔", badge: "border-zinc-300 bg-zinc-100 text-zinc-800", dot: "bg-zinc-700" },
  overdue: { emoji: "🔴", badge: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
};

export const TRACK_STYLE: Record<Track, { text: string; bg: string; border: string }> = {
  medical: { text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" },
  education: { text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  social: { text: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
};

export const TRACK_ORDER: Track[] = ["medical", "education", "social"];

export const PRIORITY_STYLE: Record<Priority, string> = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-slate-200 bg-white text-slate-700",
  low: "border-slate-200 bg-white text-slate-500",
};

export const CASE_STATUS_STYLE: Record<CaseStatus, string> = {
  interview: "border-slate-200 bg-slate-50 text-slate-700",
  plan_draft: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export const EVENT_STYLE: Record<EventType, { dot: string; chip: string }> = {
  meal: { dot: "bg-orange-400", chip: "border-orange-200 bg-orange-50 text-orange-800" },
  training: { dot: "bg-sky-500", chip: "border-sky-200 bg-sky-50 text-sky-800" },
  specialist: { dot: "bg-violet-500", chip: "border-violet-200 bg-violet-50 text-violet-800" },
  medical: { dot: "bg-rose-500", chip: "border-rose-200 bg-rose-50 text-rose-800" },
  medication: { dot: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  sleep: { dot: "bg-indigo-400", chip: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  other: { dot: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-700" },
};

export const REVIEW_STATUS_STYLE: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-700",
};
