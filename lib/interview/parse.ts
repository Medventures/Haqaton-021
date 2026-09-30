import type { Facts, RedFlag, SlotId } from "@/lib/interview/facts";

const LETTER = "[а-яёa-zәғқңөұүһі]";

const NUMBER_WORDS: Record<string, string> = {
  "полтора": "1.5",
  "полторы": "1.5",
  "один": "1",
  "одна": "1",
  "одного": "1",
  "два": "2",
  "две": "2",
  "двух": "2",
  "три": "3",
  "трех": "3",
  "четыре": "4",
  "четырех": "4",
  "пять": "5",
  "пяти": "5",
  "шесть": "6",
  "шести": "6",
  "семь": "7",
  "семи": "7",
  "восемь": "8",
  "восьми": "8",
  "девять": "9",
  "девяти": "9",
  "десять": "10",
  "десяти": "10",
  "одиннадцать": "11",
  "двенадцать": "12",
  "бір": "1",
  "екі": "2",
  "үш": "3",
  "төрт": "4",
  "бес": "5",
  "алты": "6",
  "жеті": "7",
  "сегіз": "8",
  "тоғыз": "9",
  "он": "10",
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

function wordToNumber(text: string): string {
  return text.replace(new RegExp(`(?<!${LETTER})(${Object.keys(NUMBER_WORDS).join("|")})(?!${LETTER})`, "gu"), (match) => NUMBER_WORDS[match] ?? match);
}

export function parseAgeMonths(raw: string): number | undefined {
  let text = wordToNumber(normalize(raw).replace(/,/g, "."));
  text = text
    .replace(/полгода/g, "6 месяцев")
    .replace(/(\d+)\s+с половиной/g, "$1.5")
    .replace(/(\d+)\s+жарым/g, "$1.5")
    .replace(/10\s+(\d)(?!\d)/g, (_, digit: string) => String(10 + Number(digit)));
  const yearsMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:год|года|лет|г\.?|жас[а-яәғқңөұүһі]*)(?![а-яёa-zәғқңөұүһі])/u);
  const monthsMatch = text.match(/(\d+)\s*(?:мес|месяц|месяца|месяцев|м\.|ай[а-яәғқңөұүһі]*)(?![а-яёa-zәғқңөұүһі])/u);
  const years = yearsMatch ? Number(yearsMatch[1]) : 0;
  const months = monthsMatch ? Number(monthsMatch[1]) : 0;
  if (yearsMatch || monthsMatch) {
    const total = Math.round(years * 12) + months;
    return total >= 0 && total <= 216 ? total : undefined;
  }
  const bare = text.match(/(\d+(?:\.\d+)?)/);
  if (!bare) {
    return undefined;
  }
  const value = Number(bare[1]);
  if (value <= 17) {
    return Math.round(value * 12);
  }
  return value <= 216 ? Math.round(value) : undefined;
}

const NEGATIVE = new RegExp(
  `(^|[^а-яёa-zәғқңөұүһі])(нет|не|ни разу|никогда|никуда|нигде|ничего|жоқ|емес|ешқашан|ештеңе|жасамадық|тексермедік|өтпедік|өткен жоқпыз)(?![а-яёa-zәғқңөұүһі])`,
  "u",
);
const POSITIVE = new RegExp(
  `(^|[^а-яёa-zәғқңөұүһі])(да|есть|конечно|ага|угу|проверял|проверяли|делали|заполнял|заполняли|наблюдается|наблюдаемся|обсуждали|регулярно|иә|ия|бар|тексердік|толтырдық|талқыладық|тұрақты|өттік)(?![а-яёa-zәғқңөұүһі])`,
  "u",
);

const RED_FLAG_PATTERNS: Array<[RedFlag, RegExp]> = [
  [
    "skill_loss",
    /(перестал[аи]?|разучил|потерял[аи]?\s+(навык|реч|слов)|пропал[аи]?\s+(реч|слов)|регресс|откат|ұмытып қалды|жоғалтты|тоқтатты|айтпай қалды|сөйлемей қалды)/u,
  ],
  [
    "self_harm",
    /(бье?т\s+себя|бьется\s+голов|кусает\s+себя|царапает\s+себя|самоповрежд|вредит\s+себе|ранит\s+себя|өзін ұрады|өзін тістейді|өзіне зиян|басын ұрады)/u,
  ],
  ["aggression", /(агресс|нападает|бье?т\s+(других|детей|брат|сестр|мам|пап|нас)|кусает\s+(других|детей)|басқаларды ұрады|балаларды ұрады)/u],
  ["seizures", /(судорог|припад|эпилеп|приступ|құрыс|талма|ұстама)/u],
];

export function detectRedFlags(raw: string): RedFlag[] {
  const text = normalize(raw);
  return RED_FLAG_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([flag]) => flag);
}

function matchFirst<T extends string>(text: string, rules: Array<[T, RegExp]>): T | undefined {
  return rules.find(([, pattern]) => pattern.test(text))?.[0];
}

function yesNo(text: string): "yes" | "no" | undefined {
  if (NEGATIVE.test(text)) {
    return "no";
  }
  if (POSITIVE.test(text)) {
    return "yes";
  }
  return undefined;
}

export function parseSlotAnswer(slot: SlotId, raw: string): Facts {
  const text = normalize(raw);
  if (!text) {
    return {};
  }
  switch (slot) {
    case "child_age_months": {
      const months = parseAgeMonths(raw);
      return months === undefined ? {} : { child_age_months: months };
    }
    case "main_concerns": {
      const concerns = (
        [
          ["speech", /(реч|говор|слов|молчит|звук|сөйле|сөз|үндемейді)/u],
          ["social", /(контакт|глаза|взгляд|имя|общ|игра[еюя]т?\s+один|не\s+откликается|сверстник|қарым-қатынас|көзге|атына|жалғыз ойнайды|құрдас)/u],
          ["behavior", /(поведен|истерик|ряд|повтор|стереотип|кружит|машет|упрям|агресс|мінез|қылық|ашуланады|қатарға тізеді)/u],
          ["sleep_food", /(сон|спит|засыпа|еда|ест|питани|кормл|ұйқы|ұйықта|тамақ|жемейді)/u],
        ] as const
      )
        .filter(([, pattern]) => pattern.test(text))
        .map(([value]) => value);
      return { main_concerns: concerns.length > 0 ? [...concerns] : ["other"] };
    }
    case "red_flags": {
      const flags = detectRedFlags(raw);
      if (flags.length > 0) {
        return { red_flags: flags };
      }
      return NEGATIVE.test(text) || /не было|всё хорошо|все хорошо|болған жоқ|бәрі жақсы/u.test(text) ? { red_flags: ["none"] } : {};
    }
    case "diagnosis_status": {
      const value = matchFirst(text, [
        ["in_progress", /(обслед|в процессе|проходим|ждем|пока нет заключ|тексеріліп|тексерілуде|тексеруден өтіп)/u],
        ["none", NEGATIVE],
        ["confirmed", /(да|постав|есть|установ|подтверд|иә|қойды|қойылды|бар)/u],
      ]);
      return value ? { diagnosis_status: value } : {};
    }
    case "diagnosed_by": {
      const value = matchFirst(text, [
        ["psychiatrist", /психиатр/u],
        ["neurologist", /невролог|невропатолог/u],
        ["private_clinic", /(частн|клиник|платн|жеке|ақылы)/u],
      ]);
      return { diagnosed_by: value ?? "other" };
    }
    case "screening_done": {
      if (/(не помн|не знаю|не уверен|есімде жоқ|білмеймін)/u.test(text)) {
        return { screening_done: "unknown" };
      }
      const value = yesNo(text);
      return value ? { screening_done: value } : {};
    }
    case "hearing_checked": {
      const value = yesNo(text);
      return value ? { hearing_checked: value } : {};
    }
    case "dynamic_observation": {
      const value = yesNo(text);
      return value ? { dynamic_observation: value } : {};
    }
    case "vkk_done": {
      const value = yesNo(text);
      return value ? { vkk_done: value } : {};
    }
    case "specialists_done": {
      const value = matchFirst(text, [
        ["partial", /(частично|не все|некоторы|только|ішінара|кейбір|бәрі емес)/u],
        ["no", NEGATIVE],
        ["yes", /(да|есть|все|иә|бар|бәрі)/u],
      ]);
      return value ? { specialists_done: value } : {};
    }
    case "pmpk_status": {
      const value = matchFirst(text, [
        ["expired", /(давно|устар|больше года|старое|прошлом году|баяғыда|ескі|өткен жылы)/u],
        ["none", NEGATIVE],
        ["done", /(да|проходил|есть|заключени|иә|өттік|қорытынды бар)/u],
      ]);
      return value ? { pmpk_status: value } : {};
    }
    case "correction_help": {
      const value = matchFirst(text, [
        ["kppk", /(кппк|пптк|кабинет)/u],
        ["rehab_center", /(реабил|центр|оңалту|орталық)/u],
        ["private", /(частн|платн|репетитор|логопед|дефектолог|психолог|жеке|ақылы)/u],
        ["none", NEGATIVE],
      ]);
      return value ? { correction_help: value } : {};
    }
    case "education_place": {
      const value = matchFirst(text, [
        ["inclusive_class", /инклюзив/u],
        ["special_group", /(специальн|коррекцион|арнайы)/u],
        ["school", /(школ|мектеп)/u],
        ["kindergarten", /(сад|ясл|балабақша|бала бақша)/u],
        ["home", /(дома|дом[^а-яё]|дом$|с мамой|с бабушкой|няня|үйде|әжесімен|анасымен)/u],
      ]);
      return value ? { education_place: value } : {};
    }
    case "disability_status": {
      const value = matchFirst(text, [
        ["in_process", /(в процессе|оформля|собира|подали|рәсімдеп|рәсімдеу|құжат жинап)/u],
        ["none", NEGATIVE],
        ["established", /(да|есть|установ|иә|бар|белгіленді)/u],
      ]);
      return value ? { disability_status: value } : {};
    }
    case "ipr_benefits": {
      const values: Array<"ipr" | "benefits"> = [];
      if (/(ипр|ожб|программ|бағдарлама)/u.test(text)) {
        values.push("ipr");
      }
      if (/(пособ|выплат|жәрдемақы|төлем)/u.test(text)) {
        values.push("benefits");
      }
      if (values.length > 0 && !/(нет ипр|ипр нет|без ипр|ожб жоқ)/u.test(text)) {
        return { ipr_benefits: values };
      }
      return NEGATIVE.test(text) ? { ipr_benefits: ["nothing"] } : {};
    }
    case "city": {
      const city = raw.trim().replace(/^(в|г\.?|город|қаласы)\s+/iu, "");
      return city ? { city: city.slice(0, 100) } : {};
    }
  }
}
