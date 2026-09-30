"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCheck, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";
import { STATUS_STYLE } from "@/lib/labels";
import {
  PRIORITIES,
  RESPONSIBLES,
  STEP_STATUSES,
  type PlanStep,
  type Priority,
  type Responsible,
  type StepStatus,
} from "@/lib/plan/schema";
import { stepTitle } from "@/lib/plan/view";
import { cn } from "@/lib/utils";

export function useCaseAction(caseId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (body: Record<string, unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      await postJson(`/api/cases/${caseId}/actions`, body);
      toast.success(success);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

export function EditStepDialog({ caseId, step, today }: { caseId: string; step: PlanStep; today: string }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<Priority>(step.priority);
  const [responsible, setResponsible] = useState<Responsible>(step.responsible);
  const [deadline, setDeadline] = useState(step.deadline);
  const [explanation, setExplanation] = useState(step.explanation);
  const [explanationKk, setExplanationKk] = useState(step.explanationKk);
  const { busy, run } = useCaseAction(caseId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setPriority(step.priority);
          setResponsible(step.responsible);
          setDeadline(step.deadline);
          setExplanation(step.explanation);
          setExplanationKk(step.explanationKk);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Pencil /> {t.common.edit}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{stepTitle(step, locale)}</DialogTitle>
          <DialogDescription>{t.plan.editHint}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>{t.plan.priorityField}</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t.priorities[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{t.plan.responsibleLabel}</Label>
              <Select value={responsible} onValueChange={(value) => setResponsible(value as Responsible)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSIBLES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t.responsible[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`deadline-${step.id}`}>{t.plan.deadlineLabel}</Label>
            <Input id={`deadline-${step.id}`} type="date" min={today} value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`explanation-${step.id}`}>{t.plan.explanationRu}</Label>
            <Textarea id={`explanation-${step.id}`} rows={4} value={explanation} onChange={(event) => setExplanation(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`explanation-kk-${step.id}`}>{t.plan.explanationKk}</Label>
            <Textarea id={`explanation-kk-${step.id}`} rows={4} value={explanationKk} onChange={(event) => setExplanationKk(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={busy || !deadline || !explanation.trim() || !explanationKk.trim()}
            onClick={async () => {
              const ok = await run(
                {
                  type: "updateStep",
                  stepId: step.id,
                  priority,
                  responsible,
                  deadline,
                  explanation: explanation.trim(),
                  explanationKk: explanationKk.trim(),
                },
                t.plan.stepUpdated,
              );
              if (ok) {
                setOpen(false);
              }
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoveDeadlineDialog({
  caseId,
  step,
  today,
  className,
}: {
  caseId: string;
  step: PlanStep;
  today: string;
  className?: string;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState(step.deadline < today ? today : step.deadline);
  const [reason, setReason] = useState("");
  const { busy, run } = useCaseAction(caseId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDeadline(step.deadline < today ? today : step.deadline);
          setReason("");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className={cn("h-8", className)}>
          <CalendarClock /> {t.plan.moveDeadline}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.plan.moveDeadline}</DialogTitle>
          <DialogDescription>{stepTitle(step, locale)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor={`move-${step.id}`}>{t.plan.newDeadline}</Label>
            <Input id={`move-${step.id}`} type="date" min={today} value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`reason-${step.id}`}>{t.plan.reasonRequired}</Label>
            <Textarea
              id={`reason-${step.id}`}
              rows={3}
              placeholder={t.plan.reasonPlaceholder}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={busy || !deadline || reason.trim().length < 3}
            onClick={async () => {
              const ok = await run({ type: "moveDeadline", stepId: step.id, deadline, reason: reason.trim() }, t.plan.deadlineMoved);
              if (ok) {
                setOpen(false);
              }
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t.plan.move}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StatusSelect({ caseId, step, className }: { caseId: string; step: PlanStep; className?: string }) {
  const { t } = useI18n();
  const { busy, run } = useCaseAction(caseId);
  return (
    <Select
      value={step.status}
      disabled={busy}
      onValueChange={(value) => void run({ type: "setStatus", stepId: step.id, status: value }, t.plan.statusChanged(t.statuses[value as StepStatus]))}
    >
      <SelectTrigger size="sm" className={cn("h-8 w-44 bg-white", className)} aria-label={t.plan.changeStatus}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STEP_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_STYLE[status].emoji} {t.statuses[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ResolveEscalationButton({ caseId, stepId }: { caseId: string; stepId: string }) {
  const { t } = useI18n();
  const { busy, run } = useCaseAction(caseId);
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 border-red-200 text-red-700 hover:bg-red-50"
      disabled={busy}
      onClick={() => void run({ type: "resolveEscalation", stepId }, t.plan.resolved)}
    >
      {busy ? <Loader2 className="animate-spin" /> : <CheckCheck />} {t.plan.resolve}
    </Button>
  );
}
