import type { ExtraAnswer, Facts } from "@/lib/interview/facts";
import { L, localized, type Locale, type Localized } from "@/lib/i18n/locale";

export type SlotKind = "single" | "multi" | "age" | "text";

export type QuestionOption = {
  value: string;
  label: Localized;
};

export type QuestionDef = {
  id: string;
  builtIn: boolean;
  kind: SlotKind;
  required: boolean;
  active: boolean;
  sortOrder: number;
  question: Localized;
  purpose: string;
  options: QuestionOption[];
  when: (facts: Facts) => boolean;
  fallback: unknown;
};

export const MIN_QUESTIONS = 8;
export const MAX_QUESTIONS = 12;

const always = () => true;
const isConfirmed = (facts: Facts) => facts.diagnosis_status === "confirmed";

type BuiltInSlot = Omit<QuestionDef, "builtIn" | "active" | "sortOrder">;

const YES = L("Да", "Иә");
const NO = L("Нет", "Жоқ");

export const BUILTIN_SLOTS: BuiltInSlot[] = [
  {
    id: "child_age_months",
    kind: "age",
    required: true,
    question: L("Сколько лет ребёнку?", "Балаңыз неше жаста?"),
    purpose: "возраст ребёнка в месяцах",
    options: [
      { value: "12", label: L("До 1 года 4 месяцев", "1 жас 4 айға дейін") },
      { value: "24", label: L("От 1 года 4 месяцев до 2,5 лет", "1 жас 4 айдан 2,5 жасқа дейін") },
      { value: "48", label: L("От 2,5 до 6 лет", "2,5 жастан 6 жасқа дейін") },
      { value: "96", label: L("6 лет и старше", "6 жас және одан үлкен") },
    ],
    when: always,
    fallback: 48,
  },
  {
    id: "main_concerns",
    kind: "multi",
    required: true,
    question: L(
      "Что вас беспокоит в развитии ребёнка? Можно выбрать несколько вариантов.",
      "Баланың дамуында сізді не алаңдатады? Бірнеше нұсқаны таңдауға болады.",
    ),
    purpose: "что беспокоит родителей в развитии",
    options: [
      { value: "speech", label: L("Речь", "Сөйлеу") },
      { value: "social", label: L("Контакт с людьми", "Адамдармен қарым-қатынас") },
      { value: "behavior", label: L("Поведение", "Мінез-құлық") },
      { value: "sleep_food", label: L("Сон или еда", "Ұйқы немесе тамақтану") },
      { value: "other", label: L("Другое", "Басқа") },
    ],
    when: always,
    fallback: ["other"],
  },
  {
    id: "red_flags",
    kind: "multi",
    required: true,
    question: L(
      "Бывало ли, что ребёнок перестал делать то, что уже умел, или есть поведение, опасное для него самого?",
      "Бала бұрын істей алған нәрсесін істемей қалған кездер болды ма, әлде өзіне қауіпті мінез-құлқы бар ма?",
    ),
    purpose: "тревожные признаки: потеря навыков, самоповреждение, сильная агрессия, судороги",
    options: [
      { value: "none", label: L("Нет, такого не было", "Жоқ, мұндай болған жоқ") },
      { value: "skill_loss", label: L("Потерял освоенные навыки", "Меңгерген дағдыларын жоғалтты") },
      { value: "self_harm", label: L("Причиняет себе вред", "Өзіне зиян келтіреді") },
      { value: "aggression", label: L("Сильная агрессия", "Қатты агрессия") },
      { value: "seizures", label: L("Судороги", "Құрысулар") },
    ],
    when: always,
    fallback: ["none"],
  },
  {
    id: "diagnosis_status",
    kind: "single",
    required: true,
    question: L("Ставил ли специалист ребёнку диагноз?", "Маман балаға диагноз қойды ма?"),
    purpose: "ставил ли специалист диагноз",
    options: [
      { value: "none", label: NO },
      { value: "in_progress", label: L("Сейчас обследуемся", "Қазір тексеріліп жатырмыз") },
      { value: "confirmed", label: YES },
    ],
    when: always,
    fallback: "none",
  },
  {
    id: "diagnosed_by",
    kind: "single",
    required: true,
    question: L("Какой специалист поставил диагноз?", "Диагнозды қай маман қойды?"),
    purpose: "какой специалист поставил диагноз",
    options: [
      { value: "psychiatrist", label: L("Детский психиатр", "Балалар психиатры") },
      { value: "neurologist", label: L("Невролог", "Невролог") },
      { value: "private_clinic", label: L("Частная клиника", "Жеке клиника") },
      { value: "other", label: L("Другой специалист", "Басқа маман") },
    ],
    when: isConfirmed,
    fallback: "other",
  },
  {
    id: "screening_done",
    kind: "single",
    required: true,
    question: L(
      "Заполняли ли вы в поликлинике опросник о развитии ребёнка (M-CHAT)?",
      "Емханада баланың дамуы туралы сауалнаманы (M-CHAT) толтырдыңыз ба?",
    ),
    purpose: "заполняли ли опросник M-CHAT",
    options: [
      { value: "yes", label: YES },
      { value: "no", label: NO },
      { value: "unknown", label: L("Не помню", "Есімде жоқ") },
    ],
    when: (facts) =>
      facts.diagnosis_status === "none" &&
      facts.child_age_months !== undefined &&
      facts.child_age_months >= 16 &&
      facts.child_age_months <= 30,
    fallback: "unknown",
  },
  {
    id: "hearing_checked",
    kind: "single",
    required: true,
    question: L("Проверяли ли ребёнку слух?", "Баланың есту қабілетін тексердіңіз бе?"),
    purpose: "проверяли ли слух",
    options: [
      { value: "yes", label: YES },
      { value: "no", label: NO },
    ],
    when: (facts) => facts.diagnosis_status !== undefined && facts.diagnosis_status !== "confirmed",
    fallback: "no",
  },
  {
    id: "specialists_done",
    kind: "single",
    required: false,
    question: L(
      "Есть ли у вас заключения невролога, офтальмолога и сурдолога?",
      "Сізде невролог, офтальмолог және сурдолог қорытындылары бар ма?",
    ),
    purpose: "есть ли заключения невролога, офтальмолога, сурдолога",
    options: [
      { value: "yes", label: L("Есть все", "Бәрі бар") },
      { value: "partial", label: L("Частично", "Ішінара") },
      { value: "no", label: NO },
    ],
    when: always,
    fallback: "no",
  },
  {
    id: "dynamic_observation",
    kind: "single",
    required: true,
    question: L(
      "Наблюдается ли ребёнок регулярно у детского психиатра?",
      "Бала балалар психиатрында тұрақты бақылауда ма?",
    ),
    purpose: "есть ли динамическое наблюдение у детского психиатра",
    options: [
      { value: "yes", label: L("Да, регулярно", "Иә, тұрақты") },
      { value: "no", label: NO },
    ],
    when: isConfirmed,
    fallback: "no",
  },
  {
    id: "pmpk_status",
    kind: "single",
    required: true,
    question: L(
      "Проходили ли вы ПМПК (психолого-медико-педагогическую консультацию)?",
      "ПМПК-дан (психологиялық-медициналық-педагогикалық консультациядан) өттіңіз бе?",
    ),
    purpose: "проходили ли ПМПК",
    options: [
      { value: "none", label: NO },
      { value: "done", label: L("Да, заключение есть", "Иә, қорытынды бар") },
      { value: "expired", label: L("Да, но давно", "Иә, бірақ баяғыда") },
    ],
    when: always,
    fallback: "none",
  },
  {
    id: "correction_help",
    kind: "single",
    required: true,
    question: L(
      "Занимается ли ребёнок с логопедом, дефектологом или психологом?",
      "Бала логопедпен, дефектологпен немесе психологпен айналыса ма?",
    ),
    purpose: "где ребёнок получает коррекционные занятия",
    options: [
      { value: "none", label: NO },
      { value: "kppk", label: L("Да, в КППК", "Иә, ППТК-да") },
      { value: "rehab_center", label: L("Да, в реабилитационном центре", "Иә, оңалту орталығында") },
      { value: "private", label: L("Да, частно", "Иә, жеке") },
    ],
    when: always,
    fallback: "none",
  },
  {
    id: "education_place",
    kind: "single",
    required: true,
    question: L("Где ребёнок проводит день?", "Бала күнін қайда өткізеді?"),
    purpose: "где ребёнок проводит день: дома, сад, школа",
    options: [
      { value: "home", label: L("Дома", "Үйде") },
      { value: "kindergarten", label: L("Обычный детский сад", "Қарапайым балабақша") },
      { value: "special_group", label: L("Специальная группа", "Арнайы топ") },
      { value: "school", label: L("Обычная школа", "Қарапайым мектеп") },
      { value: "inclusive_class", label: L("Инклюзивный класс", "Инклюзивті сынып") },
    ],
    when: always,
    fallback: "home",
  },
  {
    id: "disability_status",
    kind: "single",
    required: true,
    question: L("Установлена ли ребёнку инвалидность?", "Балаға мүгедектік белгіленді ме?"),
    purpose: "установлена ли инвалидность",
    options: [
      { value: "none", label: NO },
      { value: "in_process", label: L("В процессе оформления", "Рәсімдеу үстінде") },
      { value: "established", label: YES },
    ],
    when: isConfirmed,
    fallback: "none",
  },
  {
    id: "vkk_done",
    kind: "single",
    required: true,
    question: L(
      "Обсуждали ли вы с врачом направление на МСЭ (заключение ВКК)?",
      "Дәрігермен МӘС-ке жолдама (ДКК қорытындысы) туралы сөйлестіңіз бе?",
    ),
    purpose: "обсуждали ли с врачом основания для МСЭ, есть ли заключение ВКК",
    options: [
      { value: "no", label: NO },
      { value: "yes", label: YES },
    ],
    when: (facts) => isConfirmed(facts) && facts.disability_status === "none",
    fallback: "no",
  },
  {
    id: "ipr_benefits",
    kind: "multi",
    required: true,
    question: L("Есть ли у ребёнка ИПР и оформлены ли пособия?", "Баланың ОЖБ-сы бар ма және жәрдемақылар рәсімделді ме?"),
    purpose: "есть ли ИПР и оформлены ли пособия",
    options: [
      { value: "ipr", label: L("ИПР есть", "ОЖБ бар") },
      { value: "benefits", label: L("Пособия оформлены", "Жәрдемақылар рәсімделген") },
      { value: "nothing", label: L("Ничего нет", "Ештеңе жоқ") },
    ],
    when: (facts) => isConfirmed(facts) && facts.disability_status === "established",
    fallback: ["nothing"],
  },
  {
    id: "city",
    kind: "text",
    required: false,
    question: L("В каком городе вы живёте?", "Қай қалада тұрасыз?"),
    purpose: "город проживания",
    options: [
      { value: "Алматы", label: L("Алматы", "Алматы") },
      { value: "Астана", label: L("Астана", "Астана") },
      { value: "Шымкент", label: L("Шымкент", "Шымкент") },
      { value: "Караганда", label: L("Караганда", "Қарағанды") },
    ],
    when: always,
    fallback: undefined,
  },
];

const builtInMap = new Map(BUILTIN_SLOTS.map((slot) => [slot.id, slot]));

export function getBuiltInSlot(id: string): BuiltInSlot | undefined {
  return builtInMap.get(id);
}

export function defaultQuestionDefs(): QuestionDef[] {
  return BUILTIN_SLOTS.map((slot, index) => ({ ...slot, builtIn: true, active: true, sortOrder: (index + 1) * 10 }));
}

export function readAnswer(def: Pick<QuestionDef, "id" | "builtIn">, facts: Facts): unknown {
  if (def.builtIn) {
    return (facts as Record<string, unknown>)[def.id];
  }
  return facts.extra?.[def.id];
}

export function isAnswered(def: QuestionDef, facts: Facts): boolean {
  return readAnswer(def, facts) !== undefined;
}

export function getMissingQuestions(defs: QuestionDef[], facts: Facts): QuestionDef[] {
  return defs.filter((def) => def.active && def.when(facts) && !isAnswered(def, facts));
}

export function getCandidateQuestions(defs: QuestionDef[], facts: Facts, askedCount: number): QuestionDef[] {
  if (askedCount >= MAX_QUESTIONS) {
    return [];
  }
  const missing = getMissingQuestions(defs, facts);
  const required = missing.filter((def) => def.required);
  if (required.length > 0) {
    return required;
  }
  if (askedCount >= MIN_QUESTIONS) {
    return [];
  }
  return missing.filter((def) => !def.required);
}

export function estimateTotalQuestions(defs: QuestionDef[], facts: Facts, askedCount: number): number {
  const requiredLeft = getMissingQuestions(defs, facts).filter((def) => def.required).length;
  return Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, askedCount + requiredLeft));
}

export function fillRequiredDefaults(defs: QuestionDef[], facts: Facts): Facts {
  const result: Facts = { ...facts };
  for (let guard = 0; guard < defs.length; guard += 1) {
    const missing = getMissingQuestions(defs, result).filter((def) => def.required && def.builtIn && def.fallback !== undefined);
    if (missing.length === 0) {
      break;
    }
    Object.assign(result, { [missing[0].id]: missing[0].fallback });
  }
  return result;
}

export function valuesToFact(def: QuestionDef, values: string[]): Facts | null {
  const allowed = new Set(def.options.map((option) => option.value));
  if (def.kind === "age") {
    const months = Number(values[0]);
    if (!Number.isInteger(months) || months < 0 || months > 216) {
      return null;
    }
    return { child_age_months: months };
  }
  if (def.kind === "text") {
    const text = values[0]?.trim().slice(0, 100);
    if (!text) {
      return null;
    }
    return def.builtIn ? ({ [def.id]: text } as Facts) : { extra: { [def.id]: text } };
  }
  const picked = [...new Set(values)].filter((value) => allowed.has(value));
  if (picked.length === 0) {
    return null;
  }
  const exclusive = def.id === "red_flags" ? "none" : def.id === "ipr_benefits" ? "nothing" : null;
  const normalized = exclusive && picked.length > 1 ? picked.filter((value) => value !== exclusive) : picked;
  const value: ExtraAnswer = def.kind === "single" ? normalized[0] : normalized;
  return def.builtIn ? ({ [def.id]: value } as Facts) : { extra: { [def.id]: value } };
}

export function textToCustomFact(def: QuestionDef, text: string): Facts {
  const trimmed = text.trim().slice(0, 500);
  const matched = def.options.filter((option) =>
    [option.label.ru, option.label.kk].some((label) => label && trimmed.toLowerCase().includes(label.toLowerCase())),
  );
  if (def.kind === "single" && matched.length > 0) {
    return { extra: { [def.id]: matched[0].value } };
  }
  if (def.kind === "multi" && matched.length > 0) {
    return { extra: { [def.id]: matched.map((option) => option.value) } };
  }
  return { extra: { [def.id]: trimmed } };
}

export function describeAnswer(def: Pick<QuestionDef, "id" | "options"> | undefined, id: string, value: unknown, locale: Locale): string {
  if (value === undefined || value === null) {
    return "—";
  }
  if (id === "child_age_months" && typeof value === "number") {
    const years = Math.floor(value / 12);
    const months = value % 12;
    if (locale === "kk") {
      return years > 0 ? `${years} жас ${months} ай` : `${months} ай`;
    }
    return years > 0 ? `${years} г. ${months} мес.` : `${months} мес.`;
  }
  const options = def?.options ?? getBuiltInSlot(id)?.options ?? [];
  const labelFor = (item: string) => {
    const option = options.find((candidate) => candidate.value === item);
    return option ? localized(option.label, locale) : item;
  };
  if (Array.isArray(value)) {
    return value.map((item) => labelFor(String(item))).join(", ");
  }
  return labelFor(String(value));
}

export function describeFactValue(id: string, value: unknown, locale: Locale = "ru"): string {
  return describeAnswer(getBuiltInSlot(id), id, value, locale);
}
