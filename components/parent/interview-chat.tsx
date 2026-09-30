"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, SendHorizontal, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { PlanGenerating } from "@/components/parent/plan-generating";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";
import type { InterviewState } from "@/lib/interview/engine";
import { cn } from "@/lib/utils";

function BotBubble({ empathy, question, highlight }: { empathy: string | null; question: string; highlight?: boolean }) {
  return (
    <div className="flex max-w-[88%] flex-col gap-1 self-start">
      <div
        className={cn(
          "rounded-2xl rounded-tl-sm border bg-white px-4 py-3 text-[15px] leading-relaxed shadow-sm",
          highlight && "border-primary/40",
        )}
      >
        {empathy ? <p className="mb-1 text-muted-foreground">{empathy}</p> : null}
        <p className="font-medium">{question}</p>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground shadow-sm">
      {text}
    </div>
  );
}

function AlertBubble({ text }: { text: string }) {
  return (
    <div className="flex max-w-[92%] items-start gap-2 self-start rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function TypingBubble() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 self-start rounded-2xl rounded-tl-sm border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
      <Loader2 className="size-4 animate-spin" />
      {t.interview.thinking}
    </div>
  );
}

export function InterviewChat({ initialState }: { initialState: InterviewState }) {
  const { t } = useI18n();
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const current = state.current;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state, pending]);

  const submit = async (payload: { values?: string[]; text?: string }) => {
    if (!current || pending) {
      return;
    }
    setPending(true);
    try {
      const next = await postJson<InterviewState>("/api/interview/answer", { slot: current.slot, ...payload });
      setState(next);
      setText("");
      setSelected([]);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const goBack = async () => {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      setState(await postJson<InterviewState>("/api/interview/back"));
      setSelected([]);
      setText("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const toggle = (value: string) => {
    const exclusive = current?.slot === "red_flags" ? "none" : current?.slot === "ipr_benefits" ? "nothing" : null;
    setSelected((previous) => {
      if (previous.includes(value)) {
        return previous.filter((item) => item !== value);
      }
      if (value === exclusive) {
        return [value];
      }
      return [...previous.filter((item) => item !== exclusive), value];
    });
  };

  if (state.done) {
    return <PlanGenerating caseId={state.caseId} />;
  }

  const questionNumber = Math.max(1, state.asked);
  const progress = Math.min(100, Math.round(((questionNumber - 1) / state.estimatedTotal) * 100));

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-14 z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2"
            disabled={pending || state.answered.length === 0}
            onClick={() => void goBack()}
          >
            <ArrowLeft /> {t.common.back}
          </Button>
          <div className="text-sm font-medium">
            {t.interview.progress(questionNumber, state.estimatedTotal)}
          </div>
          <div className="flex w-16 justify-end">
            {state.aiEnabled ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Sparkles className="size-3.5" /> AI
              </span>
            ) : null}
          </div>
        </div>
        <Progress value={progress} className="mt-2 h-1.5" />
      </div>

      <div className="flex flex-col gap-3">
        {state.answered.map((turn, index) => (
          <div key={`${turn.slot}-${index}`} className="flex flex-col gap-3">
            <BotBubble empathy={turn.empathy} question={turn.question} />
            <UserBubble text={turn.answerText} />
            {turn.alert ? <AlertBubble text={t.interview.redFlagAlert} /> : null}
          </div>
        ))}
        {current && !pending ? <BotBubble empathy={current.empathy} question={current.question} highlight /> : null}
        {pending ? <TypingBubble /> : null}
      </div>

      {current ? (
        <div className="mt-1 rounded-2xl border bg-white/80 p-3">
          {current.kind === "multi" ? (
            <p className="mb-2 text-xs text-muted-foreground">{t.interview.multiHint}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {current.options.map((option) => {
              const active = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={pending}
                  onClick={() => (current.kind === "multi" ? toggle(option.value) : void submit({ values: [option.value] }))}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-left text-sm font-medium transition disabled:opacity-50",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/30 bg-white text-primary hover:bg-primary/5",
                  )}
                >
                  {active ? <Check className="size-4" /> : null}
                  {option.label}
                </button>
              );
            })}
          </div>
          {current.kind === "multi" ? (
            <Button
              className="mt-3 h-11 w-full text-base"
              disabled={pending || selected.length === 0}
              onClick={() => void submit({ values: selected })}
            >
              {t.interview.answer}
            </Button>
          ) : null}
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (text.trim()) {
                void submit({ text: text.trim() });
              }
            }}
          >
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={pending}
              maxLength={500}
              placeholder={current.kind === "age" ? t.interview.agePlaceholder : t.interview.placeholder}
              className="h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
            />
            <Button type="submit" size="icon-lg" className="size-11 rounded-xl" disabled={pending || !text.trim()} aria-label={t.common.send}>
              <SendHorizontal />
            </Button>
          </form>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
