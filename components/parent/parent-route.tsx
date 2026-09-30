"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleCheck,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  RotateCcw,
  Siren,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/badges";
import { MoveDeadlineDialog, StatusSelect } from "@/components/plan/step-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { Track } from "@/lib/catalog";
import { errorMessage, postJson } from "@/lib/client-api";
import { formatDate, formatDays } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { STATUS_STYLE, TRACK_ORDER, TRACK_STYLE } from "@/lib/labels";
import { displayStatus, overdueDays } from "@/lib/plan/overdue";
import type { CasePlan, PlanStep } from "@/lib/plan/schema";
import { planDocumentName, planSummary, planUrgentReason, stepExplanation, stepOrganization, stepTitle } from "@/lib/plan/view";
import { cn } from "@/lib/utils";

const TRACK_ICONS: Record<Track, typeof Stethoscope> = {
  medical: Stethoscope,
  education: BookOpen,
  social: Landmark,
};

type Props = {
  caseId: string;
  childName: string;
  curatorName: string | null;
  plan: CasePlan;
  today: string;
};

function DocumentList({
  step,
  editable,
  busy,
  onToggle,
}: {
  step: PlanStep;
  editable: boolean;
  busy: string | null;
  onToggle?: (documentId: string, ready: boolean) => void;
}) {
  const { locale } = useI18n();
  return (
    <ul className="flex flex-col gap-2">
      {step.documents.map((document) => {
        const key = `${step.id}:${document.id}`;
        const content = (
          <>
            {busy === key ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
            ) : document.ready ? (
              <CircleCheck className="size-5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="size-5 shrink-0 text-slate-300" />
            )}
            <span className={cn("text-left text-sm", document.ready && "text-muted-foreground line-through")}>
              {planDocumentName(document, locale)}
            </span>
          </>
        );
        return (
          <li key={document.id}>
            {editable ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => onToggle?.(document.id, !document.ready)}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl border bg-white px-3 py-2 hover:bg-muted"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ParentRoute({ caseId, childName, curatorName, plan, today }: Props) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const hasCurator = Boolean(curatorName);
  const selfManaged = !hasCurator;
  const byId = new Map(plan.steps.map((step) => [step.id, step]));
  const openStep = openStepId ? byId.get(openStepId) ?? null : null;
  const nextStep = (plan.nextStepId ? byId.get(plan.nextStepId) : null) ?? plan.steps.find((step) => step.status !== "done") ?? null;
  const allDone = plan.steps.every((step) => step.status === "done");
  const overdueText = hasCurator ? t.plan.overdueParentCurator : t.plan.overdueParentSelf;
  const urgentReason = planUrgentReason(plan, locale);

  const act = async (key: string, body: Record<string, unknown>, success: string) => {
    setBusy(key);
    try {
      await postJson(`/api/cases/${caseId}/actions`, body);
      toast.success(success);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const restart = async () => {
    setBusy("restart");
    try {
      await postJson("/api/interview/restart");
      router.push("/parent/interview");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">{t.plan.routeOf}</p>
        <h1 className="text-2xl font-semibold">{childName}</h1>
      </div>

      {!hasCurator ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <span className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            {t.plan.aiBanner}
          </span>
          <Link href="/parent/subscription" className="inline-flex h-9 items-center rounded-lg bg-primary px-3 font-medium text-primary-foreground hover:bg-primary/90">
            {t.plan.aiBannerCta}
          </Link>
        </div>
      ) : plan.approved ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <BadgeCheck className="mt-0.5 size-4 shrink-0" />
          {t.plan.curatorApproved(plan.approvedBy ?? curatorName ?? "")}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
          {t.plan.curatorReviewing(curatorName ?? "")}
        </div>
      )}

      {plan.urgent && urgentReason ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <Siren className="mt-0.5 size-5 shrink-0" />
          <div>
            <div className="font-semibold">{t.plan.urgentTitle}</div>
            <p className="mt-1">{urgentReason}</p>
          </div>
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,1fr)]">
        {nextStep && !allDone ? (
          <section className="rounded-2xl border-2 border-primary bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">{t.plan.nextAction}</div>
            <h2 className="mt-1 text-xl font-semibold leading-snug">{stepTitle(nextStep, locale)}</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  {t.plan.whereToGo}: {stepOrganization(nextStep, locale)}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className={cn(overdueDays(nextStep, today) > 0 && "font-medium text-red-700")}>
                  {t.plan.until(formatDate(nextStep.deadline, locale))}
                </span>
              </div>
              {overdueDays(nextStep, today) > 0 ? <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{overdueText}</p> : null}
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FileText className="size-4 text-primary" /> {t.plan.takeWith}
              </div>
              <DocumentList step={nextStep} editable={false} busy={null} />
            </div>
            <Button className="mt-5 h-12 w-full text-base sm:w-auto sm:px-6" onClick={() => setOpenStepId(nextStep.id)}>
              {t.plan.stepDetails} <ChevronRight />
            </Button>
          </section>
        ) : (
          <section className="rounded-2xl border bg-emerald-50 p-5 text-emerald-800">
            <CheckCircle2 className="size-8" />
            <h2 className="mt-2 text-lg font-semibold">{t.plan.allDoneTitle}</h2>
            <p className="mt-1 text-sm">{t.plan.allDoneText}</p>
          </section>
        )}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{t.plan.summaryTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{planSummary(plan, locale)}</p>
          {curatorName ? <p className="mt-3 text-xs text-muted-foreground">{t.plan.yourCurator(curatorName)}</p> : null}
          {selfManaged ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-3 h-9 px-2 text-muted-foreground" disabled={busy !== null}>
                  {busy === "restart" ? <Loader2 className="animate-spin" /> : <RotateCcw />} {t.plan.restartInterview}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.plan.restartTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.plan.restartText}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void restart()}>{t.common.confirm}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </section>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {TRACK_ORDER.map((track) => {
          const steps = plan.steps.filter((step) => step.track === track);
          if (steps.length === 0) {
            return null;
          }
          const Icon = TRACK_ICONS[track];
          const done = steps.filter((step) => step.status === "done").length;
          const style = TRACK_STYLE[track];
          return (
            <section key={track} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn("flex size-9 items-center justify-center rounded-lg", style.bg, style.text)}>
                    <Icon className="size-5" />
                  </span>
                  <h2 className="text-lg font-semibold">{t.tracks[track]}</h2>
                </div>
                <span className="text-right text-sm text-muted-foreground">
                  {done === steps.length ? t.plan.allStages : t.plan.stage(done + 1, steps.length)}
                </span>
              </div>
              <Progress value={(done / steps.length) * 100} className="mt-3 h-2" />
              <ol className="mt-4 flex flex-col">
                {steps.map((step, index) => {
                  const status = displayStatus(step, today);
                  const late = status === "overdue";
                  return (
                    <li key={step.id} className="relative flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={cn("mt-4 size-3.5 shrink-0 rounded-full ring-4 ring-white", STATUS_STYLE[status].dot)} />
                        {index < steps.length - 1 ? <span className="w-px flex-1 bg-border" /> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenStepId(step.id)}
                        className={cn(
                          "mb-2 flex min-h-14 min-w-0 flex-1 flex-col gap-1.5 rounded-xl px-3 py-2.5 text-left hover:bg-muted",
                          late && "bg-red-50/60",
                        )}
                      >
                        <span className={cn("font-medium leading-snug break-words", step.status === "done" && "text-muted-foreground")}>
                          {stepTitle(step, locale)}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <StatusBadge status={status} />
                          <span className={cn("text-xs text-muted-foreground", late && "text-red-700")}>
                            {step.status === "done"
                              ? t.plan.doneLabel
                              : late
                                ? t.plan.overdueAgo(formatDays(overdueDays(step, today), locale))
                                : t.plan.until(formatDate(step.deadline, locale))}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <Dialog open={openStep !== null} onOpenChange={(open) => !open && setOpenStepId(null)}>
        {openStep ? (
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={displayStatus(openStep, today)} />
                <span className={cn("text-xs font-medium", TRACK_STYLE[openStep.track].text)}>{t.tracks[openStep.track]}</span>
              </div>
              <DialogTitle className="text-left text-lg leading-snug">{stepTitle(openStep, locale)}</DialogTitle>
              <DialogDescription className="sr-only">{t.plan.stepDetails}</DialogDescription>
            </DialogHeader>
            {overdueDays(openStep, today) > 0 ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{overdueText}</p> : null}
            <div className="flex flex-col gap-4 text-sm">
              <div>
                <div className="font-semibold">{t.plan.why}</div>
                <p className="mt-1 leading-relaxed text-foreground/80">{stepExplanation(openStep, locale)}</p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{stepOrganization(openStep, locale)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t.plan.deadline(formatDate(openStep.deadline, locale))}</span>
                </div>
                <div className="flex items-start gap-2">
                  <UserRound className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t.plan.who(t.responsible[openStep.responsible])}</span>
                </div>
              </div>
              {openStep.dependsOn.length > 0 ? (
                <div className="text-muted-foreground">
                  {t.plan.firstNeeded(
                    openStep.dependsOn
                      .map((id) => byId.get(id))
                      .filter((step): step is PlanStep => Boolean(step))
                      .map((step) => stepTitle(step, locale))
                      .join("; "),
                  )}
                </div>
              ) : null}
              <div>
                <div className="mb-2 font-semibold">{t.plan.documentsCheck}</div>
                <DocumentList
                  step={openStep}
                  editable
                  busy={busy}
                  onToggle={(documentId, ready) =>
                    void act(
                      `${openStep.id}:${documentId}`,
                      { type: "toggleDocument", stepId: openStep.id, documentId, ready },
                      ready ? t.plan.docReady : t.plan.docUnready,
                    )
                  }
                />
              </div>
              {selfManaged ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-3">
                  <StatusSelect caseId={caseId} step={openStep} className="h-10 w-full sm:w-48" />
                  {openStep.status !== "done" ? (
                    <MoveDeadlineDialog caseId={caseId} step={openStep} today={today} className="h-10 w-full sm:w-auto" />
                  ) : null}
                </div>
              ) : null}
              {openStep.status !== "done" ? (
                <Button
                  className="h-12 w-full text-base"
                  disabled={busy !== null}
                  onClick={() => void act(`${openStep.id}:done`, { type: "markDone", stepId: openStep.id }, t.plan.markedDone)}
                >
                  {busy === `${openStep.id}:done` ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  {t.plan.markDone}
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-emerald-800">
                  <CheckCircle2 className="size-5" /> {t.plan.stepDone}
                </div>
              )}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
