import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { requireService } from "@/lib/catalog";
import type { Facts } from "@/lib/interview/facts";
import { describeAnswer, readAnswer, type QuestionDef } from "@/lib/interview/slots";
import { getOpenAI, openaiModel, samplingParams } from "@/lib/openai";
import type { PlanDraft } from "@/lib/plan/build";
import type { Eligibility } from "@/lib/plan/eligibility";
import { PRIORITIES, RESPONSIBLES } from "@/lib/plan/schema";

const SYSTEM_PROMPT = `Ты — помощник куратора сервиса AqylRoute. Ты составляешь межведомственный маршрут помощи семье ребёнка с особенностями развития в Казахстане: медицина, образование, соцзащита. Все тексты пишешь на двух языках: русском и казахском (литературный казахский с буквами ә, ғ, қ, ң, ө, ұ, ү, һ, і).

Жёсткие правила:
1. Ты не ставишь диагноз и не делаешь выводов вида «у ребёнка аутизм», «это РАС», «нужно оформить инвалидность». Допустимо: «по вашим ответам есть основания обратиться за профессиональной оценкой», «обсудить с врачом, есть ли основания для МСЭ».
2. Ты используешь только услуги из переданного списка (serviceId). Других шагов не бывает.
3. Каждый шаг объясняешь простым языком для родителя: зачем он нужен и что семья получит на выходе. 2–3 коротких предложения, без медицинского жаргона, обращение на «Вы» / «Сіз».
4. Используй термин «динамическое наблюдение» / «динамикалық бақылау». Слово «психучёт» не используй никогда.
5. РАС не означает автоматическую инвалидность. МСЭ — только при наличии оснований, которые определяет врач.
6. Шаги, отмеченные как уже выполненные, тоже включи и кратко объясни, чем результат пригодится дальше.
7. deadlineDays — через сколько дней от сегодня шаг должен быть сделан, от 1 до 90. Учитывай зависимости.
8. priority: high — сделать в первую очередь, medium — в течение месяца-двух, low — когда появится возможность.
9. responsible: parent — действие делает семья, curator — куратор помогает с записью или местом, organization — действие зависит от организации.
10. summary — 2–4 предложения о ситуации семьи простым языком, без диагнозов и оценок ребёнка.
11. Опирайся на клинический протокол МЗ РК №145 от 30.07.2021 «Общие расстройства психологического развития (РАС)»: скрининг M-CHAT-R проводят всем детям в 2 года на ПМСП; диагноз устанавливает врач-психиатр, углублённая диагностика — ADOS-2, ADI-R и патопсихологическое исследование в центре психического здоровья; при задержке речи проверка слуха обязательна; немедикаментозные программы (ABA/EIBI, ESDM, TEACCH, PECS, адаптивная физкультура, обучение родителей) первичны; заключение ВКК нужно для ПМПК и МСЭ. Лекарства и дозировки не упоминай никогда.
12. Казахские термины: ПМПК, ППТК (вместо КППК), МӘС (МСЭ), ДКК (ВКК), ОЖБ (ИПР), АМСК (ПМСП), ХҚКО (ЦОН), мүгедектік, жәрдемақы.

Пример объяснения шага «Проверка слуха»:
ru: «Иногда ребёнок мало говорит, потому что плохо слышит. Проверка слуха помогает исключить эту причину. На выходе у Вас будет результат, который пригодится врачу и специалистам ПМПК.»
kk: «Кейде бала нашар еститіндіктен аз сөйлейді. Есту қабілетін тексеру осы себепті жоққа шығаруға көмектеседі. Нәтижесінде Сізде дәрігерге және ПМПК мамандарына қажет болатын қорытынды болады.»`;

function describeFacts(defs: QuestionDef[], facts: Facts): string {
  return defs
    .filter((def) => readAnswer(def, facts) !== undefined)
    .map((def) => `- ${def.purpose}: ${describeAnswer(def, def.id, readAnswer(def, facts), "ru")}`)
    .join("\n");
}

function describeServices(eligibility: Eligibility): string {
  return eligibility.allowed
    .map((serviceId) => {
      const service = requireService(serviceId);
      const flags = [
        eligibility.done.includes(serviceId) ? "уже выполнено" : null,
        eligibility.inProgress.includes(serviceId) ? "уже в процессе" : null,
        eligibility.urgentServiceId === serviceId ? "срочно, в течение 7 дней" : null,
      ].filter(Boolean);
      return `- ${serviceId}: ${service.title} / ${service.titleKk} (${service.organization}). ${service.description} Условие: ${service.conditions}. Обычный срок: ${service.deadlineDays} дн. Зависит от: ${service.dependsOn.join(", ") || "нет"}.${flags.length ? ` Отметка: ${flags.join(", ")}.` : ""}`;
    })
    .join("\n");
}

const bilingual = z.object({ ru: z.string(), kk: z.string() });

export async function requestPlanDraft(
  defs: QuestionDef[],
  facts: Facts,
  eligibility: Eligibility,
  options: { strict?: boolean } = {},
): Promise<PlanDraft | null> {
  const client = getOpenAI();
  if (!client) {
    return null;
  }
  const serviceEnum = z.enum(eligibility.allowed as [string, ...string[]]);
  const schema = z.object({
    summary: bilingual,
    urgentReason: bilingual.nullable(),
    steps: z.array(
      z.object({
        serviceId: serviceEnum,
        priority: z.enum(PRIORITIES),
        responsible: z.enum(RESPONSIBLES),
        deadlineDays: z.number().int(),
        explanation: bilingual,
      }),
    ),
    nextServiceId: serviceEnum,
  });
  const userPrompt = `Ответы родителя:
${describeFacts(defs, facts)}

Срочность: ${eligibility.urgent ? `да. ${eligibility.urgentReason?.ru}` : "нет"}.

Допустимые услуги (включи каждую ровно один раз):
${describeServices(eligibility)}

Составь план. nextServiceId — самый первый шаг, который семье нужно сделать сейчас (не из выполненных). urgentReason — null, если срочности нет.${
    options.strict
      ? "\n\nВажно: в прошлой версии были недопустимые формулировки. Не называй диагноз, не пиши, что у ребёнка аутизм или РАС, не обещай и не требуй инвалидность."
      : ""
  }`;
  try {
    const completion = await client.chat.completions.parse(
      {
        model: openaiModel(),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: zodResponseFormat(schema, "case_plan"),
        ...samplingParams(0),
      },
      { timeout: 90_000, maxRetries: 1 },
    );
    const parsed = completion.choices[0]?.message.parsed;
    if (!parsed) {
      return null;
    }
    const seen = new Set<string>();
    const steps = parsed.steps.filter((step) => {
      if (!eligibility.allowed.includes(step.serviceId) || seen.has(step.serviceId)) {
        return false;
      }
      seen.add(step.serviceId);
      return true;
    });
    return {
      summary: parsed.summary,
      urgentReason: parsed.urgentReason,
      steps,
      nextServiceId: eligibility.allowed.includes(parsed.nextServiceId) ? parsed.nextServiceId : null,
    };
  } catch (error) {
    console.error("OpenAI: не удалось сгенерировать план", error instanceof Error ? error.message : error);
    return null;
  }
}
