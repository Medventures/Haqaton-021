"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, Circle, CircleCheck, Landmark, Loader2, Plus, RefreshCw, Siren, Sparkles, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EscalationBadge, PriorityBadge, StatusBadge } from "@/components/badges";
import { EditStepDialog, MoveDeadlineDialog, ResolveEscalationButton, StatusSelect, useCaseAction } from "@/components/plan/step-actions";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalog, serviceTitle, type Track } from "@/lib/catalog";
import { errorMessage, postJson } from "@/lib/client-api";
import { formatDateShort, formatDateTime, formatDays } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { TRACK_ORDER, TRACK_STYLE } from "@/lib/labels";
import { displayStatus, overdueDays } from "@/lib/plan/overdue";
import type { CasePlan, PlanStep } from "@/lib/plan/schema";
import { planDocumentName, planSummary, planUrgentReason, stepExplanation, stepOrganization, stepTitle } from "@/lib/plan/view";
import { cn } from "@/lib/utils";

const TRACK_ICONS: Record<Track, typeof Stethoscope> = { medical: Stethoscope, education: BookOpen, social: Landmark };

export type OpenEscalation = { stepId: string; level: number; createdAt: string };

type Props = {
  caseId: string;
  plan: CasePlan;
  today: string;
  escalations: OpenEscalation[];
};

function StepCard({
  caseId,
  step,
  plan,
  today,
  escalation,
}: {
  caseId: string;
  step: PlanStep;
  plan: CasePlan;
  today: string;
  escalation: OpenEscalation | null;
}) {
  const { locale, t } = useI18n();
  const { busy, run } = useCaseAction(caseId);
  const status = displayStatus(step, today);
  const late = overdueDays(step, today);
  const byId = new Map(plan.steps.map((item) => [item.id, item]));
  const isNext = plan.nextStepId === step.id && step.status !== "done";
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm",
        late > 0 && "border-red-300 ring-1 ring-red-200",
        isNext && late === 0 && "border-primary/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={status} />
        <PriorityBadge priority={step.priority} />
        {isNext ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{t.plan.nextStepBadge}</span> : null}
      </div>
      {escalation ? <EscalationBadge level={escalation.level === 2 ? 2 : 1} since={escalation.createdAt} /> : null}
      <div>
        <h3 className="font-semibold leading-snug">{stepTitle(step, locale)}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{stepOrganization(step, locale)}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t.plan.responsibleLabel}</dt>
        <dd>{t.responsible[step.responsible]}</dd>
        <dt className="text-muted-foreground">{t.plan.deadlineLabel}</dt>
        <dd className={cn(late > 0 && "font-medium text-red-700")}>
          {formatDateShort(step.deadline)}
          {late > 0 ? ` · ${t.plan.overdueBy(formatDays(late, locale))}` : ""}
        </dd>
        {step.dependsOn.length > 0 ? (
          <>
            <dt className="text-muted-foreground">{t.plan.dependsLabel}</dt>
            <dd>
              {step.dependsOn
                .map((id) => byId.get(id))
                .filter((item): item is PlanStep => Boolean(item))
                .map((item) => stepTitle(item, locale))
                .join("; ")}
            </dd>
          </>
        ) : null}
      </dl>
      <div>
        <div className="mb-1 text-xs font-medium text-muted-foreground">{t.plan.documentsLabel}</div>
        <ul className="flex flex-col gap-1 text-sm">
          {step.documents.map((document) => (
            <li key={document.id} className="flex items-start gap-2">
              {document.ready ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-slate-300" />
              )}
              <span className={cn(document.ready && "text-muted-foreground")}>{planDocumentName(document, locale)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-foreground/80">{stepExplanation(step, locale)}</p>
      <div className="flex flex-wrap gap-2 border-t pt-3">
        {plan.approved ? (
          <>
            <StatusSelect caseId={caseId} step={step} />
            {step.status !== "done" ? <MoveDeadlineDialog caseId={caseId} step={step} today={today} /> : null}
            {escalation ? <ResolveEscalationButton caseId={caseId} stepId={step.id} /> : null}
          </>
        ) : (
          <>
            <EditStepDialog caseId={caseId} step={step} today={today} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 text-red-700 hover:bg-red-50" disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <Trash2 />} {t.common.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.plan.removeStepTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.plan.removeStepText(stepTitle(step, locale))}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void run({ type: "removeStep", stepId: step.id }, t.plan.stepRemoved)}>
                    {t.common.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </article>
  );
}

export function CasePlanBoard({ caseId, plan, today, escalations }: Props) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [serviceId, setServiceId] = useState<string>("");
  const [pending, setPending] = useState<string | null>(null);
  const { run } = useCaseAction(caseId);
  const inPlan = new Set(plan.steps.map((step) => step.serviceId));
  const available = catalog.services.filter((service) => !inPlan.has(service.id));
  const urgentReason = planUrgentReason(plan, locale);

  const regenerate = async () => {
    setPending("regenerate");
    try {
      await postJson(`/api/cases/${caseId}/generate`);
      toast.success(t.plan.regenerated);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const withPending = async (key: string, action: () => Promise<unknown>) => {
    setPending(key);
    try {
      await action();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                <Sparkles className="size-3" />
                {plan.generatedBy === "ai" ? t.plan.generatedAi : t.plan.generatedRules}
              </span>
              <span>{formatDateTime(plan.generatedAt)}</span>
              {plan.approved && plan.approvedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                  <CheckCircle2 className="size-3" />
                  {t.plan.approvedBy(plan.approvedBy ?? "", formatDateTime(plan.approvedAt))}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed">{planSummary(plan, locale)}</p>
          </div>
          {!plan.approved ? (
            <div className="flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={pending !== null}>
                    {pending === "regenerate" ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t.plan.regenerate}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.plan.regenerateTitle}</AlertDialogTitle>
                    <AlertDialogDescription>{t.plan.regenerateText}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void regenerate()}>{t.plan.regenerate}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button disabled={pending !== null} onClick={() => void withPending("approve", () => run({ type: "approve" }, t.plan.approved))}>
                {pending === "approve" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {t.plan.approve}
              </Button>
            </div>
          ) : null}
        </div>
        {plan.urgent && urgentReason ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <Siren className="mt-0.5 size-4 shrink-0" />
            {urgentReason}
          </div>
        ) : null}
        {!plan.approved ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="w-full bg-white sm:w-96">
                <SelectValue placeholder={t.plan.addStepPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {available.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {t.tracks[service.track]}: {serviceTitle(service.id, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!serviceId || pending !== null}
              onClick={() =>
                void withPending("add", async () => {
                  if (await run({ type: "addStep", serviceId }, t.plan.stepAdded)) {
                    setServiceId("");
                  }
                })
              }
            >
              {pending === "add" ? <Loader2 className="animate-spin" /> : <Plus />} {t.plan.addStep}
            </Button>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {TRACK_ORDER.map((track) => {
          const steps = plan.steps.filter((step) => step.track === track);
          const Icon = TRACK_ICONS[track];
          const style = TRACK_STYLE[track];
          return (
            <section key={track} className="flex flex-col gap-3">
              <div className={cn("flex items-center justify-between rounded-lg border px-3 py-2", style.bg, style.border)}>
                <div className={cn("flex items-center gap-2 font-semibold", style.text)}>
                  <Icon className="size-4" /> {t.tracks[track]}
                </div>
                <span className="text-xs text-muted-foreground">
                  {t.common.ofTotal(steps.filter((step) => step.status === "done").length, steps.length)}
                </span>
              </div>
              {steps.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{t.plan.noSteps}</div>
              ) : (
                steps.map((step) => (
                  <StepCard
                    key={step.id}
                    caseId={caseId}
                    step={step}
                    plan={plan}
                    today={today}
                    escalation={escalations.filter((item) => item.stepId === step.id).sort((a, b) => b.level - a.level)[0] ?? null}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
