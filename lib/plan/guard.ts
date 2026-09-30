const NOT_LETTER_BEFORE = "(?<![а-яёa-z])";
const NOT_LETTER_AFTER = "(?![а-яёa-z])";
const ASD = `(аутизм|${NOT_LETTER_BEFORE}рас${NOT_LETTER_AFTER}|расстройств[а-я]*\\s+аутистическ)`;

const UNSAFE_PATTERNS: RegExp[] = [
  new RegExp(
    `у\\s+(вашего\\s+|вашей\\s+|этого\\s+)?(ребенка|сына|дочери|малыша)\\s+(скорее\\s+всего\\s+|вероятно\\s+|похоже\\s+|точно\\s+)?(есть\\s+|имеется\\s+|наблюдается\\s+)?${ASD}`,
    "iu",
  ),
  /(ставим|ставлю|поставим|устанавливаем|подтверждаем|подтверждаю)\s+(вам\s+|ребенку\s+)?диагноз/iu,
  new RegExp(`(это|похоже\\s+на|вероятно|скорее\\s+всего|явные\\s+признаки|признаки)\\s+${ASD}`, "iu"),
  new RegExp(`(выявлен|обнаружен|установлен|подтвержден)[а-я]*\\s+${ASD}`, "iu"),
  new RegExp(`${ASD}\\s+(подтвержд|выявлен|обнаружен)`, "iu"),
  /(ребенок|ребёнок)\s+(—\s+|-\s+|является\s+)?аутист/iu,
  /(нужно|необходимо|следует|надо|должны|стоит)\s+(срочно\s+|обязательно\s+)?(оформить|получить|установить)\s+инвалидност/iu,
  /(получите|оформите|положена|гарантирована)\s+инвалидност/iu,
  /инвалидност[ьи]\s+(будет|положена|гарантирована)/iu,
  /психуч[её]т/iu,
  /психиатрическ[а-я]*\s+уч[её]т/iu,
  /на\s+уч[её]те?\s+у\s+психиатра/iu,
  /(баланың|балаңыздың|ұлыңыздың|қызыңыздың)\s+(аутизмі|асб-сы|асб)\s*(бар|анықталды)/iu,
  /(балада|балаңызда)\s+(аутизм|асб)\s+(бар|анықталды)/iu,
  /(диагноз|диагнозды)\s+(қоямыз|қойдық|растаймыз)/iu,
  /мүгедектікті?\s+(міндетті\s+түрде\s+)?(рәсімдеу|алу)\s+(керек|қажет|тиіс)/iu,
  /мүгедектік\s+(беріледі|кепілдендірілген)/iu,
  /психиатриялық\s+есеп/iu,
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е");
}

export function findUnsafePhrases(text: string | null | undefined): string[] {
  if (!text) {
    return [];
  }
  const normalized = normalize(text);
  return UNSAFE_PATTERNS.flatMap((pattern) => {
    const match = normalized.match(pattern);
    return match ? [match[0]] : [];
  });
}

export function isSafeText(text: string | null | undefined): boolean {
  return findUnsafePhrases(text).length === 0;
}
