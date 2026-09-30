"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export type AdminQuestion = {
  id: string;
  builtIn: boolean;
  kind: "single" | "multi" | "age" | "text";
  required: boolean;
  active: boolean;
  questionRu: string;
  questionKk: string;
  options: { value: string; labelRu: string; labelKk: string }[];
};

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error([data.error, ...(data.issues ?? [])].filter(Boolean).join(": "));
  }
  return data;
}

function QuestionEditor({ question }: { question: AdminQuestion }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(question);
  const [busy, setBusy] = useState(false);
  const lockedActive = question.builtIn && question.required;

  const save = async () => {
    setBusy(true);
    try {
      await send(`/api/admin/questions/${question.id}`, "PATCH", {
        questionRu: draft.questionRu,
        questionKk: draft.questionKk,
        active: draft.active,
        required: question.builtIn ? undefined : draft.required,
        options: draft.options,
      });
      toast.success(t.admin.questionSaved);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDraft(question);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Pencil /> {t.common.edit}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{question.id}</DialogTitle>
          <DialogDescription>{t.admin.kinds[question.kind]}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>{t.admin.questionRu}</Label>
            <Textarea rows={2} value={draft.questionRu} onChange={(event) => setDraft({ ...draft, questionRu: event.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t.admin.questionKk}</Label>
            <Textarea rows={2} value={draft.questionKk} onChange={(event) => setDraft({ ...draft, questionKk: event.target.value })} />
          </div>
          {draft.options.length > 0 ? (
            <div className="grid gap-2">
              <Label>{t.admin.options}</Label>
              {draft.options.map((option, index) => (
                <div key={option.value} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[90px_1fr_1fr]">
                  <code className="self-center text-xs text-muted-foreground">{option.value}</code>
                  <Input
                    aria-label={t.admin.optionRu}
                    value={option.labelRu}
                    onChange={(event) => {
                      const options = [...draft.options];
                      options[index] = { ...option, labelRu: event.target.value };
                      setDraft({ ...draft, options });
                    }}
                  />
                  <Input
                    aria-label={t.admin.optionKk}
                    value={option.labelKk}
                    onChange={(event) => {
                      const options = [...draft.options];
                      options[index] = { ...option, labelKk: event.target.value };
                      setDraft({ ...draft, options });
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <label className={cn("flex items-center gap-2 text-sm", lockedActive && "opacity-60")}>
              <Checkbox checked={draft.active} disabled={lockedActive} onCheckedChange={(value) => setDraft({ ...draft, active: value === true })} />
              {t.admin.active}
            </label>
            {!question.builtIn ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={draft.required} onCheckedChange={(value) => setDraft({ ...draft, required: value === true })} />
                {t.admin.required}
              </label>
            ) : null}
          </div>
          {lockedActive ? <p className="text-xs text-muted-foreground">{t.admin.requiredLocked}</p> : null}
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewQuestionDialog() {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"single" | "multi" | "text">("single");
  const [required, setRequired] = useState(false);
  const [questionRu, setQuestionRu] = useState("");
  const [questionKk, setQuestionKk] = useState("");
  const [options, setOptions] = useState([
    { labelRu: "", labelKk: "" },
    { labelRu: "", labelKk: "" },
  ]);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      await postJson("/api/admin/questions", {
        kind,
        required,
        questionRu,
        questionKk,
        options: kind === "text" ? [] : options.filter((option) => option.labelRu.trim() && option.labelKk.trim()),
      });
      toast.success(t.admin.questionSaved);
      setOpen(false);
      setQuestionRu("");
      setQuestionKk("");
      setOptions([
        { labelRu: "", labelKk: "" },
        { labelRu: "", labelKk: "" },
      ]);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> {t.admin.addQuestion}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.admin.newQuestion}</DialogTitle>
          <DialogDescription>{t.admin.questionsSubtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>{t.admin.kind}</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["single", "multi", "text"] as const).map((item) => (
                    <SelectItem key={item} value={item}>
                      {t.admin.kinds[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox checked={required} onCheckedChange={(value) => setRequired(value === true)} />
              {t.admin.required}
            </label>
          </div>
          <div className="grid gap-1.5">
            <Label>{t.admin.questionRu}</Label>
            <Textarea rows={2} value={questionRu} onChange={(event) => setQuestionRu(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t.admin.questionKk}</Label>
            <Textarea rows={2} value={questionKk} onChange={(event) => setQuestionKk(event.target.value)} />
          </div>
          {kind !== "text" ? (
            <div className="grid gap-2">
              <Label>{t.admin.options}</Label>
              {options.map((option, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder={t.admin.optionRu}
                    value={option.labelRu}
                    onChange={(event) => setOptions(options.map((item, position) => (position === index ? { ...item, labelRu: event.target.value } : item)))}
                  />
                  <Input
                    placeholder={t.admin.optionKk}
                    value={option.labelKk}
                    onChange={(event) => setOptions(options.map((item, position) => (position === index ? { ...item, labelKk: event.target.value } : item)))}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.common.delete}
                    disabled={options.length <= 2}
                    onClick={() => setOptions(options.filter((_, position) => position !== index))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                disabled={options.length >= 8}
                onClick={() => setOptions([...options, { labelRu: "", labelKk: "" }])}
              >
                <Plus /> {t.admin.addOption}
              </Button>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            disabled={
              busy ||
              questionRu.trim().length < 3 ||
              questionKk.trim().length < 3 ||
              (kind !== "text" && options.filter((option) => option.labelRu.trim() && option.labelKk.trim()).length < 2)
            }
            onClick={() => void create()}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionsManager({ questions }: { questions: AdminQuestion[] }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);
    try {
      await action();
      if (success) {
        toast.success(success);
      }
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <NewQuestionDialog />
      </div>
      <ol className="flex flex-col gap-2">
        {questions.map((question, index) => (
          <li key={question.id} className={cn("rounded-xl border bg-white p-3 shadow-sm", !question.active && "opacity-60")}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.admin.moveUp}
                  disabled={index === 0 || busy !== null}
                  onClick={() => void run(`${question.id}:up`, () => postJson(`/api/admin/questions/${question.id}/move`, { direction: "up" }))}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.admin.moveDown}
                  disabled={index === questions.length - 1 || busy !== null}
                  onClick={() => void run(`${question.id}:down`, () => postJson(`/api/admin/questions/${question.id}/move`, { direction: "down" }))}
                >
                  <ArrowDown />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-mono text-muted-foreground">{index + 1}. {question.id}</span>
                  <span className="rounded-full border px-2 py-0.5">{question.builtIn ? t.admin.builtIn : t.admin.custom}</span>
                  <span className="rounded-full border px-2 py-0.5">{t.admin.kinds[question.kind]}</span>
                  <span className={cn("rounded-full border px-2 py-0.5", question.required && "border-primary/30 bg-primary/5 text-primary")}>
                    {question.required ? t.admin.required : t.admin.optionalQ}
                  </span>
                  <span className={cn("rounded-full border px-2 py-0.5", question.active ? "text-emerald-700" : "text-muted-foreground")}>
                    {question.active ? t.admin.active : t.admin.inactive}
                  </span>
                </div>
                <div className="mt-1 font-medium">{locale === "kk" ? question.questionKk : question.questionRu}</div>
                <div className="text-sm text-muted-foreground">{locale === "kk" ? question.questionRu : question.questionKk}</div>
                {question.options.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {question.options.map((option) => (
                      <span key={option.value} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                        {locale === "kk" ? option.labelKk : option.labelRu}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <QuestionEditor question={question} />
                {!question.builtIn ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 text-red-700 hover:bg-red-50" disabled={busy !== null}>
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.admin.deleteQuestion}</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void run(`${question.id}:delete`, () => send(`/api/admin/questions/${question.id}`, "DELETE"), t.admin.questionDeleted)}
                        >
                          {t.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
