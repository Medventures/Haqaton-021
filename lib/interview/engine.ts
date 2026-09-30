import { ApiError } from "@/lib/api";
import { getCase, saveCase, type CaseRecord } from "@/lib/cases";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import { requestInterviewTurn, type AiInterviewResult } from "@/lib/interview/ai";
import { activeRedFlags, mergeFacts, slotIds, type Facts, type SlotId } from "@/lib/interview/facts";
import { detectRedFlags, parseSlotAnswer } from "@/lib/interview/parse";
import { loadQuestionDefs } from "@/lib/interview/questions";
import {
  MAX_QUESTIONS,
  estimateTotalQuestions,
  fillRequiredDefaults,
  getCandidateQuestions,
  isAnswered,
  textToCustomFact,
  valuesToFact,
  type QuestionDef,
  type SlotKind,
} from "@/lib/interview/slots";
import type { InterviewTurn } from "@/lib/interview/turns";
import { isAiEnabled } from "@/lib/openai";
import { isSafeText } from "@/lib/plan/guard";
import type { CaseStatus } from "@/lib/plan/schema";

export type InterviewAnswer = {
  slot: string;
  values?: string[];
  text?: string;
};

export type InterviewState = {
  caseId: string;
  childName: string;
  status: CaseStatus;
  answered: { slot: string; question: string; empathy: string | null; answerText: string; alert: boolean }[];
  current: {
    slot: string;
    question: string;
    empathy: string | null;
    options: { value: string; label: string }[];
    kind: SlotKind;
    source: "ai" | "rules";
  } | null;
  asked: number;
  estimatedTotal: number;
  done: boolean;
  aiEnabled: boolean;
};

function cleanText(value: string | null | undefined, maxLength: number): string | null {
  const text = value?.trim();
  if (!text || text.length > maxLength || !isSafeText(text)) {
    return null;
  }
  return text;
}

function buildTurn(
  def: QuestionDef,
  at: string,
  locale: Locale,
  ai: Pick<AiInterviewResult, "question" | "options" | "empathy"> | null,
  override?: { question: string; empathy: string | null },
): InterviewTurn {
  const aiQuestion = cleanText(ai?.question, 300);
  const options = def.options.map((option) => {
    const label = cleanText(ai?.options.find((candidate) => candidate.value === option.value)?.label, 60);
    return { value: option.value, label: label ?? option.label[locale] };
  });
  return {
    slot: def.id,
    question: override?.question ?? aiQuestion ?? def.question[locale],
    empathy: override ? override.empathy : cleanText(ai?.empathy, 200),
    options,
    kind: def.kind,
    source: ai && aiQuestion && !override ? "ai" : "rules",
    locale,
    askedAt: at,
    answer: null,
    extracted: null,
    alert: false,
  };
}

function recomputeFacts(turns: InterviewTurn[]): Facts {
  return turns.reduce<Facts>((facts, turn) => (turn.answer && turn.extracted ? mergeFacts(facts, turn.extracted) : facts), {});
}

export async function toInterviewState(record: CaseRecord): Promise<InterviewState> {
  const defs = await loadQuestionDefs();
  const turns = record.interview;
  const pending = record.status === "interview" ? turns.find((turn) => turn.answer === null) ?? null : null;
  return {
    caseId: record.id,
    childName: record.childName,
    status: record.status,
    answered: turns
      .filter((turn) => turn.answer)
      .map((turn) => ({
        slot: turn.slot,
        question: turn.question,
        empathy: turn.empathy,
        answerText: turn.answer?.text ?? "",
        alert: turn.alert,
      })),
    current: pending
      ? {
          slot: pending.slot,
          question: pending.question,
          empathy: pending.empathy,
          options: pending.options,
          kind: pending.kind,
          source: pending.source,
        }
      : null,
    asked: turns.length,
    estimatedTotal: record.status === "interview" ? estimateTotalQuestions(defs, record.facts, turns.length) : turns.length,
    done: record.status !== "interview",
    aiEnabled: isAiEnabled(),
  };
}

async function askNext(
  defs: QuestionDef[],
  facts: Facts,
  turns: InterviewTurn[],
  at: string,
  locale: Locale,
  lastAnswer: { slot: string; text: string } | null,
  earlyAi: AiInterviewResult | null,
): Promise<InterviewTurn | null> {
  const candidates = getCandidateQuestions(defs, facts, turns.length);
  if (candidates.length === 0) {
    return null;
  }
  if (earlyAi?.nextSlot) {
    const chosen = candidates.find((def) => def.id === earlyAi.nextSlot);
    if (chosen && cleanText(earlyAi.question, 300)) {
      return buildTurn(chosen, at, locale, earlyAi);
    }
  }
  const ai = await requestInterviewTurn({ defs, facts, turns, lastAnswer, candidates, locale });
  const chosen = candidates.find((def) => def.id === ai?.nextSlot) ?? candidates[0];
  return buildTurn(chosen, at, locale, ai && ai.nextSlot === chosen.id ? ai : null);
}

async function loadInterviewCase(caseId: string): Promise<CaseRecord> {
  const record = await getCase(caseId);
  if (!record) {
    throw new ApiError(404, "caseNotFound");
  }
  return record;
}

async function finish(record: CaseRecord, defs: QuestionDef[], facts: Facts, interview: InterviewTurn[]): Promise<CaseRecord> {
  const finalFacts = fillRequiredDefaults(defs, facts);
  await saveCase(record.id, { status: "plan_draft", facts: finalFacts, interview, plan: null });
  return { ...record, status: "plan_draft", facts: finalFacts, interview, plan: null };
}

export async function ensureInterviewStarted(record: CaseRecord, locale: Locale): Promise<CaseRecord> {
  if (record.status !== "interview" || record.interview.some((turn) => turn.answer === null)) {
    return record;
  }
  const defs = await loadQuestionDefs();
  const at = new Date().toISOString();
  const facts = recomputeFacts(record.interview);
  const next = await askNext(defs, facts, record.interview, at, locale, null, null);
  if (!next) {
    return finish(record, defs, facts, record.interview);
  }
  const interview = [...record.interview, next];
  await saveCase(record.id, { interview, facts });
  return { ...record, interview, facts };
}

export async function answerInterview(caseId: string, answer: InterviewAnswer, locale: Locale): Promise<CaseRecord> {
  const record = await loadInterviewCase(caseId);
  if (record.status !== "interview") {
    throw new ApiError(409, "interviewFinished");
  }
  const defs = await loadQuestionDefs();
  const turns = record.interview.map((turn) => ({ ...turn }));
  const pendingIndex = turns.findIndex((turn) => turn.answer === null);
  if (pendingIndex === -1 || turns[pendingIndex].slot !== answer.slot) {
    throw new ApiError(409, "questionOutdated");
  }
  const pending = turns[pendingIndex];
  const def = defs.find((candidate) => candidate.id === pending.slot);
  if (!def) {
    throw new ApiError(409, "questionOutdated");
  }
  const at = new Date().toISOString();
  const factsBefore = recomputeFacts(turns);
  const values = answer.values?.filter((value) => typeof value === "string" && value.length > 0) ?? [];
  const text = answer.text?.trim().slice(0, 500) ?? "";

  let extracted: Facts = {};
  let answerText: string;
  let earlyAi: AiInterviewResult | null = null;

  if (values.length > 0) {
    const fact = valuesToFact(def, values);
    if (!fact) {
      throw new ApiError(400, "noSuchOption");
    }
    extracted = fact;
    answerText = values.map((value) => pending.options.find((option) => option.value === value)?.label ?? value).join(", ");
  } else if (text) {
    answerText = text;
    const candidates = getCandidateQuestions(defs, factsBefore, turns.length).filter((candidate) => candidate.id !== def.id);
    earlyAi = await requestInterviewTurn({ defs, facts: factsBefore, turns, lastAnswer: { slot: def.id, text }, candidates, locale });
    const fromAi = earlyAi?.extracted ?? {};
    for (const key of Object.keys(fromAi).filter((candidate) => candidate !== "extra") as SlotId[]) {
      const isAskedSlot = key === def.id;
      if (key === "red_flags") {
        const flags = (fromAi.red_flags ?? []).filter((flag) => isAskedSlot || flag !== "none");
        if (flags.length > 0) {
          extracted.red_flags = flags;
        }
        continue;
      }
      if (isAskedSlot || factsBefore[key] === undefined) {
        Object.assign(extracted, { [key]: fromAi[key] });
      }
    }
    if (def.builtIn && (slotIds as readonly string[]).includes(def.id)) {
      const slotId = def.id as SlotId;
      const byRules = parseSlotAnswer(slotId, text);
      if (extracted[slotId] === undefined && byRules[slotId] !== undefined) {
        Object.assign(extracted, { [slotId]: byRules[slotId] });
      }
    } else {
      extracted = mergeFacts(extracted, textToCustomFact(def, text));
    }
    const regexFlags = detectRedFlags(text);
    if (regexFlags.length > 0) {
      extracted.red_flags = [...new Set([...(extracted.red_flags ?? []).filter((flag) => flag !== "none"), ...regexFlags])];
    }
  } else {
    throw new ApiError(400, "answerRequired");
  }

  let facts = mergeFacts(factsBefore, extracted);
  const timesAsked = turns.filter((turn) => turn.slot === def.id).length;
  let reask = false;
  if (!isAnswered(def, facts)) {
    if (timesAsked >= 2 || turns.length >= MAX_QUESTIONS) {
      if (def.builtIn && def.fallback !== undefined) {
        Object.assign(extracted, { [def.id]: def.fallback });
        facts = mergeFacts(factsBefore, extracted);
      }
    } else {
      reask = true;
    }
  }

  const newFlags = activeRedFlags(facts).filter((flag) => !activeRedFlags(factsBefore).includes(flag));
  turns[pendingIndex] = {
    ...pending,
    answer: { text: answerText, values: values.length > 0 ? values : null, at },
    extracted,
    alert: newFlags.length > 0,
  };
  const answeredTurns = turns.slice(0, pendingIndex + 1);

  let next: InterviewTurn | null;
  if (reask) {
    const t = getDictionary(locale);
    const base = def.question[locale];
    next = buildTurn(def, at, locale, null, {
      question: `${t.interview.clarify} ${base.charAt(0).toLowerCase()}${base.slice(1)}`,
      empathy: t.interview.clarifyEmpathy,
    });
  } else {
    next = await askNext(defs, facts, answeredTurns, at, locale, { slot: def.id, text: answerText }, earlyAi);
  }

  if (!next) {
    return finish(record, defs, facts, answeredTurns);
  }
  const interview = [...answeredTurns, next];
  await saveCase(caseId, { facts, interview });
  return { ...record, facts, interview };
}

export async function undoLastAnswer(caseId: string): Promise<CaseRecord> {
  const record = await loadInterviewCase(caseId);
  if (record.status !== "interview") {
    throw new ApiError(409, "interviewFinished");
  }
  const turns = record.interview.filter((turn) => turn.answer !== null);
  if (turns.length === 0) {
    return record;
  }
  const last = turns[turns.length - 1];
  const reopened: InterviewTurn = { ...last, answer: null, extracted: null, alert: false };
  const interview = [...turns.slice(0, -1), reopened];
  const facts = recomputeFacts(interview);
  await saveCase(caseId, { facts, interview });
  return { ...record, facts, interview };
}
