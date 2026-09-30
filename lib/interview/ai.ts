import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  concernValues,
  correctionValues,
  diagnosedByValues,
  diagnosisValues,
  disabilityValues,
  educationValues,
  iprBenefitsValues,
  pmpkValues,
  redFlagValues,
  sanitizeFacts,
  screeningValues,
  specialistsValues,
  yesNoValues,
  type Facts,
} from "@/lib/interview/facts";
import { BUILTIN_SLOTS, describeAnswer, readAnswer, type QuestionDef } from "@/lib/interview/slots";
import type { InterviewTurn } from "@/lib/interview/turns";
import type { Locale } from "@/lib/i18n/locale";
import { getOpenAI, openaiModel, samplingParams } from "@/lib/openai";

const extractedSchema = z.object({
  child_age_months: z.number().int().nullable(),
  main_concerns: z.array(z.enum(concernValues)).nullable(),
  red_flags: z.array(z.enum(redFlagValues)).nullable(),
  diagnosis_status: z.enum(diagnosisValues).nullable(),
  diagnosed_by: z.enum(diagnosedByValues).nullable(),
  screening_done: z.enum(screeningValues).nullable(),
  hearing_checked: z.enum(yesNoValues).nullable(),
  specialists_done: z.enum(specialistsValues).nullable(),
  dynamic_observation: z.enum(yesNoValues).nullable(),
  pmpk_status: z.enum(pmpkValues).nullable(),
  correction_help: z.enum(correctionValues).nullable(),
  education_place: z.enum(educationValues).nullable(),
  disability_status: z.enum(disabilityValues).nullable(),
  vkk_done: z.enum(yesNoValues).nullable(),
  ipr_benefits: z.array(z.enum(iprBenefitsValues)).nullable(),
  city: z.string().nullable(),
});

const SYSTEM_PROMPT = `Ты — тёплый и внимательный помощник сервиса AqylRoute. Ты проводишь короткое интервью с родителем ребёнка, у которого есть особенности развития, чтобы составить маршрут помощи между медициной, образованием и соцзащитой в Казахстане.

Правила:
- Задаёшь ровно один вопрос за раз, коротко (до 25 слов), простыми словами, без медицинского жаргона, вежливо, на «Вы» («Сіз» по-казахски).
- Никогда не ставишь диагноз и не делаешь выводов о том, есть ли у ребёнка аутизм или РАС. Не обещаешь и не советуешь оформлять инвалидность.
- Слово «психучёт» не используешь никогда, говоришь «динамическое наблюдение» («динамикалық бақылау»).
- empathy — одна короткая тёплая фраза (до 12 слов), которая реагирует на последний ответ родителя, или null, если ответа ещё не было. Без оценок ребёнка и без обещаний.
- extracted — только факты, которые прямо названы в последнем ответе родителя. Всё, что не названо, — null. Возраст переводи в месяцы (2 года 4 месяца = 28, 2 жас 4 ай = 28).
- nextSlot — один из переданных недостающих слотов; выбирай тот, который естественнее всего спросить после последнего ответа.
- options — варианты быстрого ответа для выбранного слота: сохрани value из списка без изменений, label можешь сделать короче и теплее (до 40 символов).
- Язык вопроса, empathy и label указан в запросе. Казахский — литературный, грамотный, с буквами ә, ғ, қ, ң, ө, ұ, ү, һ, і.`;

export type AiInterviewResult = {
  extracted: Facts;
  nextSlot: string | null;
  question: string | null;
  options: { value: string; label: string }[];
  empathy: string | null;
};

function describeKnownFacts(defs: QuestionDef[], facts: Facts): string {
  const known = defs.filter((def) => readAnswer(def, facts) !== undefined);
  if (known.length === 0) {
    return "пока ничего";
  }
  return known.map((def) => `- ${def.id} (${def.purpose}): ${describeAnswer(def, def.id, readAnswer(def, facts), "ru")}`).join("\n");
}

function describeSlotCatalog(): string {
  return BUILTIN_SLOTS.map((slot) => {
    if (slot.kind === "age") {
      return `- child_age_months: ${slot.purpose}, число месяцев`;
    }
    if (slot.kind === "text") {
      return `- ${slot.id}: ${slot.purpose}, свободный текст`;
    }
    const values = slot.options.map((option) => `${option.value} = ${option.label.ru}`).join("; ");
    return `- ${slot.id}: ${slot.purpose}${slot.kind === "multi" ? " (можно несколько)" : ""}. Значения: ${values}`;
  }).join("\n");
}

function describeCandidates(candidates: QuestionDef[], locale: Locale): string {
  return candidates
    .map((def) => {
      const options = def.options.map((option) => `{value: "${option.value}", label: "${option.label[locale]}"}`).join(", ");
      return `- ${def.id}: базовый вопрос «${def.question[locale]}». Варианты: ${options || "свободный ответ"}`;
    })
    .join("\n");
}

function describeHistory(turns: InterviewTurn[]): string {
  const answered = turns.filter((turn) => turn.answer).slice(-12);
  if (answered.length === 0) {
    return "диалог только начинается";
  }
  return answered.map((turn) => `Вопрос: ${turn.question}\nОтвет: ${turn.answer?.text}`).join("\n");
}

export async function requestInterviewTurn(input: {
  defs: QuestionDef[];
  facts: Facts;
  turns: InterviewTurn[];
  lastAnswer: { slot: string; text: string } | null;
  candidates: QuestionDef[];
  locale: Locale;
}): Promise<AiInterviewResult | null> {
  const client = getOpenAI();
  if (!client) {
    return null;
  }
  const candidateIds = input.candidates.map((def) => def.id);
  const schema = z.object({
    extracted: extractedSchema,
    nextSlot: candidateIds.length > 0 ? z.enum(candidateIds as [string, ...string[]]).nullable() : z.null(),
    question: z.string().nullable(),
    options: z.array(z.object({ value: z.string(), label: z.string() })),
    empathy: z.string().nullable(),
  });
  const userPrompt = `Язык вопроса, empathy и label: ${input.locale === "kk" ? "казахский" : "русский"}.

Что уже известно:
${describeKnownFacts(input.defs, input.facts)}

История диалога:
${describeHistory(input.turns)}

Последний ответ родителя: ${input.lastAnswer ? `на вопрос про ${input.lastAnswer.slot}: «${input.lastAnswer.text}»` : "ещё не было"}

Слоты и допустимые значения для extracted:
${describeSlotCatalog()}

Недостающие слоты, из которых нужно выбрать nextSlot:
${candidateIds.length > 0 ? describeCandidates(input.candidates, input.locale) : "нет — интервью заканчивается, nextSlot = null, question = null, options = []"}`;
  try {
    const completion = await client.chat.completions.parse(
      {
        model: openaiModel(),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: zodResponseFormat(schema, "interview_turn"),
        ...samplingParams(0.3),
      },
      { timeout: 20_000, maxRetries: 0 },
    );
    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) {
      return null;
    }
    return {
      extracted: sanitizeFacts(parsed.extracted as Record<string, unknown>),
      nextSlot: parsed.nextSlot && candidateIds.includes(parsed.nextSlot) ? parsed.nextSlot : null,
      question: parsed.question,
      options: parsed.options,
      empathy: parsed.empathy,
    };
  } catch (error) {
    console.error("OpenAI: не удалось получить вопрос интервью", error instanceof Error ? error.message : error);
    return null;
  }
}
