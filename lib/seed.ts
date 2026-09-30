import { addDays, fromLocalDateTime, toDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import type { Facts } from "@/lib/interview/facts";
import { ensureBuiltInQuestions } from "@/lib/interview/questions";
import { getBuiltInSlot } from "@/lib/interview/slots";
import type { InterviewTurn } from "@/lib/interview/turns";
import { LEGAL_VERSION } from "@/lib/legal";
import { hashPassword } from "@/lib/password";
import { buildPlan } from "@/lib/plan/build";
import { casePlanSchema, type CasePlan, type HistoryEntry, type StepStatus } from "@/lib/plan/schema";
import { makePdf, makePng } from "@/lib/seed-assets";

const DAY_MS = 86_400_000;

export const SEED_PASSWORD = process.env.SEED_PASSWORD || "Aqyl2026!";

export const SEED_ACCOUNTS = [
  { email: "admin@aqylroute.kz", name: "Данияр Сейтказин", role: "admin" },
  { email: "commission@aqylroute.kz", name: "Гульнара Абенова", role: "commission" },
  { email: "commission2@aqylroute.kz", name: "Серик Жумагулов", role: "commission" },
  { email: "moderator@aqylroute.kz", name: "Мадина Ержанова", role: "moderator" },
  { email: "curator@aqylroute.kz", name: "Айгерим Нурланова", role: "curator" },
  { email: "curator2@aqylroute.kz", name: "Асель Бекова", role: "curator" },
  { email: "curator3@aqylroute.kz", name: "Тимур Алиев", role: "curator" },
  { email: "dinara@example.kz", name: "Динара Ахметова", role: "parent" },
  { email: "erlan@example.kz", name: "Ерлан Сериков", role: "parent" },
  { email: "zhanna@example.kz", name: "Жанна Омарова", role: "parent" },
  { email: "asel@example.kz", name: "Асель Жумабаева", role: "parent" },
  { email: "marat@example.kz", name: "Марат Касымов", role: "parent" },
  { email: "specialist@aqylroute.kz", name: "Жанар Сапарова", role: "specialist" },
] as const;

type SpecialistSeed = {
  email: string;
  name: string;
  category: string;
  city: string;
  experienceYears: number;
  aboutRu: string;
  aboutKk: string;
  education: string;
  priceKzt: number | null;
  formats: string[];
  languages: string[];
  contact: string;
  status: "approved" | "pending" | "rejected";
  commissionNote?: string;
};

const SPECIALISTS: SpecialistSeed[] = [
  {
    email: "specialist@aqylroute.kz",
    name: "Жанар Сапарова",
    category: "speech_therapist",
    city: "Караганда",
    experienceYears: 12,
    aboutRu:
      "Логопед-дефектолог. Работаю с неговорящими детьми и детьми с задержкой речи, использую PECS и альтернативную коммуникацию. Занятия в игровой форме, обязательно даю задания для дома.",
    aboutKk:
      "Логопед-дефектолог. Сөйлемейтін және сөйлеуі кешіккен балалармен жұмыс істеймін, PECS пен балама коммуникацияны қолданамын. Сабақтар ойын түрінде өтеді, үйге міндетті түрде тапсырма беремін.",
    education: "Карагандинский университет им. Букетова, дефектология. Курсы PECS (уровень 1), альтернативная коммуникация.",
    priceKzt: 8000,
    formats: ["offline", "online"],
    languages: ["ru", "kk"],
    contact: "+7 701 111 22 33, Telegram @zhanar_logoped",
    status: "approved",
  },
  {
    email: "aliya.mukanova@aqylroute.kz",
    name: "Алия Муканова",
    category: "aba_therapist",
    city: "Астана",
    experienceYears: 7,
    aboutRu:
      "АВА-терапевт. Составляю индивидуальные программы по прикладному анализу поведения, обучаю родителей справляться с нежелательным поведением дома.",
    aboutKk:
      "ABA-терапевт. Мінез-құлықты қолданбалы талдау бойынша жеке бағдарламалар құрастырамын, ата-аналарды үйде қалаусыз мінез-құлықпен жұмыс істеуге үйретемін.",
    education: "Сертификат RBT, курс прикладного анализа поведения (ИПАС), супервизия BCBA.",
    priceKzt: 12000,
    formats: ["offline", "home"],
    languages: ["ru", "kk"],
    contact: "+7 702 222 33 44",
    status: "approved",
  },
  {
    email: "erzhan.kasenov@aqylroute.kz",
    name: "Ержан Касенов",
    category: "trainer",
    city: "Караганда",
    experienceYears: 9,
    aboutRu: "Тренер по адаптивной физической культуре. Развиваю координацию, выносливость и навыки игры в паре и группе.",
    aboutKk: "Бейімделген дене шынықтыру жаттықтырушысы. Үйлестіруді, төзімділікті және жұппен, топпен ойнау дағдыларын дамытамын.",
    education: "Казахская академия спорта и туризма, адаптивная физическая культура.",
    priceKzt: 6000,
    formats: ["offline"],
    languages: ["kk", "ru"],
    contact: "+7 705 333 44 55",
    status: "approved",
  },
  {
    email: "saltanat.omarova@aqylroute.kz",
    name: "Салтанат Омарова",
    category: "nutritionist",
    city: "Алматы",
    experienceYears: 6,
    aboutRu: "Нутрициолог. Помогаю семьям, где ребёнок избирателен в еде: постепенно расширяем рацион без давления и составляем меню на неделю.",
    aboutKk: "Нутрициолог. Тамақ таңдайтын баласы бар отбасыларға көмектесемін: қысымсыз рационды біртіндеп кеңейтіп, апталық мәзір құрастырамыз.",
    education: "Нутрициология (международная программа), курсы по пищевому поведению детей.",
    priceKzt: 10000,
    formats: ["online"],
    languages: ["ru", "kk", "en"],
    contact: "saltanat.nutrition@example.kz",
    status: "approved",
  },
  {
    email: "gulmira.akhmetzhanova@aqylroute.kz",
    name: "Гульмира Ахметжанова",
    category: "nanny",
    city: "Караганда",
    experienceYears: 15,
    aboutRu: "Няня с опытом работы с детьми с особенностями развития. Соблюдаю режим, визуальное расписание и рекомендации специалистов.",
    aboutKk: "Даму ерекшеліктері бар балалармен тәжірибесі бар бала күтуші. Күн тәртібін, көрнекі кестені және мамандардың ұсынымдарын сақтаймын.",
    education: "Педагогический колледж, курс первой помощи, обучение у АВА-терапевта.",
    priceKzt: 2500,
    formats: ["home"],
    languages: ["kk", "ru"],
    contact: "+7 707 444 55 66",
    status: "approved",
  },
  {
    email: "nurlan.bekenov@aqylroute.kz",
    name: "Нурлан Бекенов",
    category: "child_psychiatrist",
    city: "Астана",
    experienceYears: 18,
    aboutRu: "Детский психиатр. Консультации, диагностика по клиническому протоколу и динамическое наблюдение. Объясняю родителям каждый шаг.",
    aboutKk: "Балалар психиатры. Кеңес беру, клиникалық хаттама бойынша диагностика және динамикалық бақылау. Ата-аналарға әр қадамды түсіндіремін.",
    education: "НМУ им. С. Асфендиярова. Сертификат специалиста: психиатрия детская. Сертификат ADOS-2.",
    priceKzt: 20000,
    formats: ["offline", "online"],
    languages: ["ru", "kk"],
    contact: "+7 708 555 66 77",
    status: "approved",
  },
  {
    email: "aizhan.tursynova@aqylroute.kz",
    name: "Айжан Турсынова",
    category: "neurologist",
    city: "Караганда",
    experienceYears: 11,
    aboutRu: "Детский невролог. Осмотр, заключения для ПМПК и МСЭ, консультации по сну и судорогам.",
    aboutKk: "Балалар неврологы. Қарау, ПМПК мен МӘС үшін қорытындылар, ұйқы мен құрысулар бойынша кеңестер.",
    education: "Медицинский университет Караганды. Сертификат специалиста: неврология детская.",
    priceKzt: 15000,
    formats: ["offline"],
    languages: ["ru", "kk"],
    contact: "+7 701 666 77 88",
    status: "approved",
  },
  {
    email: "marina.kim@aqylroute.kz",
    name: "Марина Ким",
    category: "psychologist",
    city: "Алматы",
    experienceYears: 10,
    aboutRu: "Семейный психолог. Поддерживаю родителей после постановки диагноза, помогаю справиться с усталостью и тревогой.",
    aboutKk: "Отбасылық психолог. Диагноз қойылғаннан кейін ата-аналарды қолдаймын, шаршау мен мазасыздықты жеңуге көмектесемін.",
    education: "КазНУ им. аль-Фараби, психология. Когнитивно-поведенческая терапия.",
    priceKzt: 12000,
    formats: ["online", "offline"],
    languages: ["ru", "en"],
    contact: "marina.kim.psy@example.kz",
    status: "approved",
  },
  {
    email: "bakhyt.seitzhanov@aqylroute.kz",
    name: "Бахыт Сейтжанов",
    category: "defectologist",
    city: "Шымкент",
    experienceYears: 14,
    aboutRu: "Дефектолог. Готовлю детей к школе, развиваю внимание, мышление и навыки самообслуживания.",
    aboutKk: "Дефектолог. Балаларды мектепке дайындаймын, зейінді, ойлауды және өзіне-өзі қызмет көрсету дағдыларын дамытамын.",
    education: "ЮКГУ им. Ауэзова, специальная педагогика.",
    priceKzt: 7000,
    formats: ["offline", "home"],
    languages: ["kk", "ru"],
    contact: "+7 702 777 88 99",
    status: "approved",
  },
  {
    email: "dinara.zhumabekova@aqylroute.kz",
    name: "Динара Жумабекова",
    category: "occupational_therapist",
    city: "Астана",
    experienceYears: 5,
    aboutRu: "Эрготерапевт. Сенсорная интеграция, мелкая моторика, навыки самостоятельности в быту.",
    aboutKk: "Эрготерапевт. Сенсорлық интеграция, ұсақ моторика, тұрмыста дербестік дағдылары.",
    education: "Курсы сенсорной интеграции (Ayres), эрготерапия в педиатрии.",
    priceKzt: 11000,
    formats: ["offline"],
    languages: ["ru", "kk"],
    contact: "+7 705 888 99 00",
    status: "approved",
  },
  {
    email: "asem.nurgalieva@aqylroute.kz",
    name: "Асем Нургалиева",
    category: "pediatrician",
    city: "Караганда",
    experienceYears: 20,
    aboutRu: "Педиатр. Оценка развития, направления к специалистам, помощь с питанием и соматическими жалобами.",
    aboutKk: "Педиатр. Дамуды бағалау, мамандарға жолдама, тамақтану және соматикалық шағымдар бойынша көмек.",
    education: "Медицинский университет Караганды. Сертификат специалиста: педиатрия.",
    priceKzt: 9000,
    formats: ["offline"],
    languages: ["kk", "ru"],
    contact: "+7 707 999 00 11",
    status: "approved",
  },
  {
    email: "olga.petrenko@aqylroute.kz",
    name: "Ольга Петренко",
    category: "massage_therapist",
    city: "Караганда",
    experienceYears: 8,
    aboutRu: "Детский массажист. Общий и лечебный массаж по назначению врача, работаю на дому.",
    aboutKk: "Балалар массажисі. Дәрігердің тағайындауы бойынша жалпы және емдік массаж, үйге барып жұмыс істеймін.",
    education: "Медицинский колледж, курсы детского массажа.",
    priceKzt: 7000,
    formats: ["home", "offline"],
    languages: ["ru"],
    contact: "+7 701 123 45 67",
    status: "pending",
  },
  {
    email: "nursultan.abdrakhmanov@aqylroute.kz",
    name: "Нурсултан Абдрахманов",
    category: "trainer",
    city: "Астана",
    experienceYears: 4,
    aboutRu: "Тренер по плаванию для детей с особенностями. Индивидуальные занятия в бассейне, постепенная адаптация к воде.",
    aboutKk: "Ерекшеліктері бар балаларға арналған жүзу жаттықтырушысы. Бассейнде жеке сабақтар, суға біртіндеп бейімдеу.",
    education: "ЕНУ им. Гумилёва, физическая культура и спорт. Курс адаптивного плавания.",
    priceKzt: 8000,
    formats: ["offline"],
    languages: ["kk", "ru"],
    contact: "+7 702 234 56 78",
    status: "pending",
  },
  {
    email: "kamila.ibraeva@aqylroute.kz",
    name: "Камила Ибраева",
    category: "speech_therapist",
    city: "Алматы",
    experienceYears: 3,
    aboutRu: "Логопед. Запуск речи, звукопроизношение, онлайн-занятия для семей из регионов.",
    aboutKk: "Логопед. Сөйлеуді бастау, дыбыстарды айту, өңірлердегі отбасыларға онлайн сабақтар.",
    education: "КазНПУ им. Абая, логопедия.",
    priceKzt: 6000,
    formats: ["online"],
    languages: ["ru", "kk"],
    contact: "+7 705 345 67 89",
    status: "pending",
  },
  {
    email: "ruslan.tleubaev@aqylroute.kz",
    name: "Руслан Тлеубаев",
    category: "nanny",
    city: "Шымкент",
    experienceYears: 1,
    aboutRu: "Помогу присмотреть за ребёнком, погулять и позаниматься. Есть опыт с младшими братьями.",
    aboutKk: "Баланы қарауға, серуендеуге және айналысуға көмектесемін. Інілерімді қараған тәжірибем бар.",
    education: "Среднее образование.",
    priceKzt: 1500,
    formats: ["home"],
    languages: ["kk"],
    contact: "+7 707 456 78 90",
    status: "rejected",
    commissionNote: "Не приложены документы об образовании и справка о несудимости. Добавьте их и отправьте анкету повторно.",
  },
];

type ReviewSeed = { specialist: string; author: string; rating: number; text: string; status: "approved" | "pending" | "rejected"; note?: string };

const REVIEWS: ReviewSeed[] = [
  { specialist: "specialist@aqylroute.kz", author: "erlan@example.kz", rating: 5, text: "Амина ждёт каждое занятие. За два месяца появились первые слова и карточки PECS дома.", status: "approved" },
  { specialist: "specialist@aqylroute.kz", author: "asel@example.kz", rating: 5, text: "Жанар апай өте мұқият, үйге арналған тапсырмалары түсінікті. Рақмет!", status: "approved" },
  { specialist: "specialist@aqylroute.kz", author: "marat@example.kz", rating: 4, text: "Хороший специалист, но запись на удобное время только через две недели.", status: "approved" },
  { specialist: "aliya.mukanova@aqylroute.kz", author: "asel@example.kz", rating: 5, text: "Алия научила нас справляться с истериками. Дома стало спокойнее.", status: "approved" },
  { specialist: "erzhan.kasenov@aqylroute.kz", author: "erlan@example.kz", rating: 5, text: "Ержан ағай балалармен жақсы тіл табысады, Амина жаттығуларды қуана жасайды.", status: "approved" },
  { specialist: "saltanat.omarova@aqylroute.kz", author: "zhanna@example.kz", rating: 4, text: "Помогла ввести новые продукты без слёз. Удобно, что онлайн.", status: "approved" },
  { specialist: "gulmira.akhmetzhanova@aqylroute.kz", author: "marat@example.kz", rating: 5, text: "Надёжная и спокойная няня, соблюдает все рекомендации логопеда.", status: "approved" },
  { specialist: "nurlan.bekenov@aqylroute.kz", author: "zhanna@example.kz", rating: 5, text: "Подробно объяснил, какие обследования нужны и зачем. Без спешки.", status: "approved" },
  { specialist: "aizhan.tursynova@aqylroute.kz", author: "dinara@example.kz", rating: 5, text: "Быстро подготовила заключение для ПМПК, всё объяснила.", status: "pending" },
  { specialist: "marina.kim@aqylroute.kz", author: "erlan@example.kz", rating: 4, text: "Психолог помогла мне самому не выгореть. Рекомендую родителям.", status: "pending" },
  {
    specialist: "bakhyt.seitzhanov@aqylroute.kz",
    author: "marat@example.kz",
    rating: 1,
    text: "Ужасно!!! Звоните лучше в центр на Абая, телефон +7 700 000 00 00, там дешевле",
    status: "rejected",
    note: "Реклама и контакты третьих лиц",
  },
];

const SERIKOV_FACTS: Facts = {
  child_age_months: 60,
  main_concerns: ["speech", "social"],
  red_flags: ["none"],
  diagnosis_status: "confirmed",
  diagnosed_by: "psychiatrist",
  specialists_done: "yes",
  dynamic_observation: "yes",
  pmpk_status: "none",
  correction_help: "none",
  education_place: "kindergarten",
  disability_status: "none",
  vkk_done: "no",
};

const SERIKOV_ANSWERS: Array<{ slot: keyof Facts; text: string; empathy: string | null }> = [
  { slot: "child_age_months", text: "Амине 5 лет", empathy: null },
  { slot: "main_concerns", text: "Речь, Контакт с людьми", empathy: "Спасибо, что рассказываете." },
  { slot: "red_flags", text: "Нет, такого не было", empathy: "Хорошо, это важно знать." },
  { slot: "diagnosis_status", text: "Да, год назад", empathy: "Понятно, спасибо." },
  { slot: "diagnosed_by", text: "Детский психиатр центра психического здоровья", empathy: "Спасибо за уточнение." },
  { slot: "specialists_done", text: "Невролог и сурдолог смотрели, заключения есть", empathy: "Отлично, эти документы пригодятся." },
  { slot: "dynamic_observation", text: "Да, регулярно", empathy: "Хорошо, что связь с врачом есть." },
  { slot: "pmpk_status", text: "Нет", empathy: "Понятно, поможем с этим шагом." },
  { slot: "correction_help", text: "Нет", empathy: "Спасибо, учтём." },
  { slot: "education_place", text: "Обычный детский сад", empathy: "Понятно." },
  { slot: "disability_status", text: "Нет", empathy: "Спасибо." },
  { slot: "vkk_done", text: "Нет", empathy: "Хорошо, это обсудим с врачом." },
];

const OMAROVA_FACTS: Facts = {
  child_age_months: 40,
  main_concerns: ["speech", "behavior", "sleep_food"],
  red_flags: ["none"],
  diagnosis_status: "in_progress",
  hearing_checked: "yes",
  specialists_done: "partial",
  pmpk_status: "none",
  correction_help: "private",
  education_place: "home",
  city: "Алматы",
};

const OMAROVA_ANSWERS: Array<{ slot: keyof Facts; text: string; empathy: string | null }> = [
  { slot: "child_age_months", text: "Томирис 3 жас 4 ай", empathy: null },
  { slot: "main_concerns", text: "Сөйлеу, мінез-құлық, ұйқы мен тамақ", empathy: "Айтып бергеніңізге рақмет." },
  { slot: "red_flags", text: "Жоқ, мұндай болған жоқ", empathy: "Жақсы, мұны білу маңызды." },
  { slot: "diagnosis_status", text: "Қазір тексеріліп жатырмыз", empathy: "Түсінікті." },
  { slot: "hearing_checked", text: "Иә", empathy: "Жақсы." },
  { slot: "specialists_done", text: "Ішінара", empathy: "Рақмет." },
  { slot: "pmpk_status", text: "Жоқ", empathy: "Бұл қадамға көмектесеміз." },
  { slot: "correction_help", text: "Иә, жеке логопедпен", empathy: "Жақсы." },
  { slot: "education_place", text: "Үйде", empathy: "Түсінікті." },
  { slot: "city", text: "Алматы", empathy: "Рақмет." },
];

function iso(date: Date): string {
  return date.toISOString();
}

function buildInterview(
  answers: Array<{ slot: keyof Facts; text: string; empathy: string | null }>,
  facts: Facts,
  start: Date,
  locale: "ru" | "kk",
): InterviewTurn[] {
  return answers.map((answer, index) => {
    const slot = getBuiltInSlot(answer.slot)!;
    const askedAt = new Date(start.getTime() + index * 60_000);
    return {
      slot: slot.id,
      question: slot.question[locale],
      empathy: answer.empathy,
      options: slot.options.map((option) => ({ value: option.value, label: option.label[locale] })),
      kind: slot.kind,
      source: "rules",
      locale,
      askedAt: iso(askedAt),
      answer: { text: answer.text, values: null, at: iso(new Date(askedAt.getTime() + 30_000)) },
      extracted: { [slot.id]: facts[answer.slot] } as Facts,
      alert: false,
    };
  });
}

type StepScenario = {
  status: StepStatus;
  deadlineOffset: number;
  readyDocuments?: string[];
  history?: Array<{ daysAgo: number; by: HistoryEntry["by"]; status: StepStatus; note: string; noteKk: string }>;
};

const SERIKOV_SCENARIO: Record<string, StepScenario> = {
  med_dynamic_observation: { status: "done", deadlineOffset: -30 },
  med_specialists: { status: "done", deadlineOffset: -30 },
  med_rehab_program: {
    status: "done",
    deadlineOffset: -5,
    history: [
      {
        daysAgo: 25,
        by: "curator",
        status: "in_progress",
        note: "Семья записалась к врачу на составление плана помощи",
        noteKk: "Отбасы көмек жоспарын құру үшін дәрігерге жазылды",
      },
      { daysAgo: 18, by: "parent", status: "done", note: "Родитель отметил шаг выполненным", noteKk: "Ата-ана қадамды орындалды деп белгіледі" },
    ],
  },
  med_rehab_course: {
    status: "in_progress",
    deadlineOffset: 5,
    readyDocuments: ["doc_psychiatrist", "doc_pmsp_referral"],
    history: [
      {
        daysAgo: 16,
        by: "curator",
        status: "in_progress",
        note: "Начали курс в реабилитационном центре",
        noteKk: "Оңалту орталығында курс басталды",
      },
    ],
  },
  med_parent_training: { status: "not_started", deadlineOffset: 15 },
  edu_pmpk: {
    status: "in_progress",
    deadlineOffset: -10,
    readyDocuments: ["doc_parent_id", "doc_child_birth", "doc_specialists"],
    history: [
      {
        daysAgo: 27,
        by: "curator",
        status: "in_progress",
        note: "Семья начала собирать документы для ПМПК",
        noteKk: "Отбасы ПМПК үшін құжаттар жинай бастады",
      },
      {
        daysAgo: 12,
        by: "curator",
        status: "in_progress",
        note: "Не хватает характеристики из детского сада, запрос отправлен заведующей",
        noteKk: "Балабақшадан мінездеме жетіспейді, меңгерушіге сұрау жіберілді",
      },
    ],
  },
  edu_kppk: { status: "not_started", deadlineOffset: 6 },
  edu_kindergarten: { status: "not_started", deadlineOffset: 20 },
  edu_support: { status: "not_started", deadlineOffset: 26 },
  soc_vkk: { status: "not_started", deadlineOffset: -3, readyDocuments: ["doc_specialists", "doc_parent_id", "doc_child_birth"] },
  soc_mse: { status: "not_started", deadlineOffset: 27 },
};

function buildSerikovPlan(current: Date, curatorName: string): CasePlan {
  const today = toDateOnly(current);
  const generatedAt = new Date(current.getTime() - 31 * DAY_MS);
  const approvedAt = new Date(current.getTime() - 30 * DAY_MS);
  const plan = buildPlan({ facts: SERIKOV_FACTS, draft: null, generatedBy: "rules", now: generatedAt, visibleToFamily: false });
  plan.approved = true;
  plan.visibleToFamily = true;
  plan.approvedAt = iso(approvedAt);
  plan.approvedBy = curatorName;
  for (const step of plan.steps) {
    const scenario = SERIKOV_SCENARIO[step.serviceId];
    if (!scenario) {
      continue;
    }
    step.status = scenario.status;
    step.deadline = addDays(today, scenario.deadlineOffset);
    const ready = new Set(scenario.status === "done" ? step.documents.map((document) => document.id) : scenario.readyDocuments ?? []);
    step.documents = step.documents.map((document) => ({ ...document, ready: ready.has(document.id) }));
    for (const entry of scenario.history ?? []) {
      step.history.push({
        at: iso(new Date(current.getTime() - entry.daysAgo * DAY_MS)),
        by: entry.by,
        status: entry.status,
        note: entry.note,
        noteKk: entry.noteKk,
      });
    }
  }
  plan.nextStepId = plan.steps.find((step) => step.serviceId === "edu_pmpk")?.id ?? plan.nextStepId;
  return casePlanSchema.parse(plan);
}

async function wipe(): Promise<void> {
  await prisma.$transaction([
    prisma.storedFile.deleteMany(),
    prisma.calendarEvent.deleteMany(),
    prisma.review.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.consent.deleteMany(),
    prisma.escalationEvent.deleteMany(),
    prisma.case.deleteMany(),
    prisma.specialistProfile.deleteMany(),
    prisma.user.deleteMany(),
    prisma.interviewQuestion.deleteMany(),
  ]);
}

async function seedQuestions(): Promise<void> {
  await ensureBuiltInQuestions();
  await prisma.interviewQuestion.create({
    data: {
      id: "custom_diet",
      builtIn: false,
      kind: "single",
      required: false,
      active: true,
      sortOrder: 175,
      questionRu: "Есть ли у ребёнка особенности питания или аллергия?",
      questionKk: "Баланың тамақтану ерекшеліктері немесе аллергиясы бар ма?",
      options: JSON.stringify([
        { value: "none", labelRu: "Нет", labelKk: "Жоқ" },
        { value: "selective", labelRu: "Ест очень избирательно", labelKk: "Тамақты қатты таңдайды" },
        { value: "allergy", labelRu: "Есть аллергия", labelKk: "Аллергиясы бар" },
        { value: "diet", labelRu: "Соблюдаем диету", labelKk: "Диета ұстанамыз" },
      ]),
    },
  });
}

function eventAt(day: string, time: string): Date {
  return fromLocalDateTime(day, time);
}

export async function seedDemo(): Promise<void> {
  const current = new Date();
  const today = toDateOnly(current);
  await wipe();
  await seedQuestions();

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const users = new Map<string, string>();
  for (const account of SEED_ACCOUNTS) {
    const user = await prisma.user.create({
      data: { email: account.email, name: account.name, role: account.role, passwordHash, phone: "+7 700 000 00 00" },
    });
    users.set(account.email, user.id);
  }
  for (const specialist of SPECIALISTS) {
    if (!users.has(specialist.email)) {
      const user = await prisma.user.create({
        data: { email: specialist.email, name: specialist.name, role: "specialist", passwordHash },
      });
      users.set(specialist.email, user.id);
    }
  }
  const id = (email: string) => users.get(email)!;

  const consentUsers = [...users.entries()].filter(([email]) => email.endsWith("@example.kz") || SPECIALISTS.some((item) => item.email === email));
  await prisma.consent.createMany({
    data: consentUsers.flatMap(([, userId]) => [
      { userId, document: "terms", version: LEGAL_VERSION, acceptedAt: new Date(current.getTime() - 40 * DAY_MS) },
      { userId, document: "privacy", version: LEGAL_VERSION, acceptedAt: new Date(current.getTime() - 40 * DAY_MS) },
    ]),
  });

  const commissionId = id("commission@aqylroute.kz");
  const profiles = new Map<string, string>();
  for (const [index, specialist] of SPECIALISTS.entries()) {
    const createdAt = new Date(current.getTime() - (60 - index * 3) * DAY_MS);
    const reviewed = specialist.status !== "pending";
    const profile = await prisma.specialistProfile.create({
      data: {
        userId: id(specialist.email),
        category: specialist.category,
        city: specialist.city,
        experienceYears: specialist.experienceYears,
        aboutRu: specialist.aboutRu,
        aboutKk: specialist.aboutKk,
        education: specialist.education,
        priceKzt: specialist.priceKzt,
        formats: JSON.stringify(specialist.formats),
        languages: JSON.stringify(specialist.languages),
        contact: specialist.contact,
        status: specialist.status,
        commissionNote: specialist.commissionNote ?? null,
        reviewedById: reviewed ? commissionId : null,
        reviewedAt: reviewed ? new Date(createdAt.getTime() + 2 * DAY_MS) : null,
        createdAt,
      },
    });
    profiles.set(specialist.email, profile.id);
    if (specialist.status !== "rejected") {
      await prisma.storedFile.create({
        data: {
          specialistProfileId: profile.id,
          uploaderId: id(specialist.email),
          category: "diploma",
          title: `Диплом — ${specialist.name}`,
          fileName: "diploma.pdf",
          mimeType: "application/pdf",
          ...pdfData(["AqylRoute - demo credential", `Specialist: ${transliterate(specialist.name)}`, "Diploma / certificate (synthetic sample)"]),
          createdAt,
        },
      });
    }
  }

  const moderatorId = id("moderator@aqylroute.kz");
  for (const [index, review] of REVIEWS.entries()) {
    const createdAt = new Date(current.getTime() - (20 - index) * DAY_MS);
    await prisma.review.create({
      data: {
        specialistId: profiles.get(review.specialist)!,
        authorId: id(review.author),
        rating: review.rating,
        text: review.text,
        status: review.status,
        moderatorId: review.status === "pending" ? null : moderatorId,
        moderatedAt: review.status === "pending" ? null : new Date(createdAt.getTime() + DAY_MS),
        moderationNote: review.note ?? null,
        createdAt,
      },
    });
  }

  const curatorId = id("curator@aqylroute.kz");
  const curatorName = "Айгерим Нурланова";

  await prisma.case.create({
    data: { id: "case-akhmetov", parentId: id("dinara@example.kz"), childName: "Алихан", status: "interview" },
  });
  await prisma.case.create({ data: { parentId: id("asel@example.kz"), childName: "Нурислам", status: "interview" } });
  await prisma.case.create({ data: { parentId: id("marat@example.kz"), childName: "Арсен", status: "interview" } });

  const serikovPlan = buildSerikovPlan(current, curatorName);
  const serikovStart = new Date(current.getTime() - 32 * DAY_MS);
  await prisma.case.create({
    data: {
      id: "case-serikov",
      parentId: id("erlan@example.kz"),
      curatorId,
      childName: "Амина",
      status: "approved",
      facts: JSON.stringify(SERIKOV_FACTS),
      interview: JSON.stringify(buildInterview(SERIKOV_ANSWERS, SERIKOV_FACTS, serikovStart, "ru")),
      plan: JSON.stringify(serikovPlan),
      createdAt: serikovStart,
    },
  });
  await prisma.subscription.create({
    data: {
      userId: id("erlan@example.kz"),
      plan: "quarter",
      priceKzt: 24900,
      status: "active",
      startsAt: new Date(current.getTime() - 31 * DAY_MS),
      endsAt: new Date(current.getTime() + 59 * DAY_MS),
      paymentRef: "TEST-SEED-SERIKOV",
    },
  });
  await prisma.consent.create({
    data: { userId: id("erlan@example.kz"), document: "curator", version: LEGAL_VERSION, acceptedAt: new Date(current.getTime() - 31 * DAY_MS) },
  });

  const escalations = serikovPlan.steps.flatMap((step) => {
    const scenario = SERIKOV_SCENARIO[step.serviceId];
    if (!scenario || scenario.deadlineOffset >= 0 || scenario.status === "done") {
      return [];
    }
    const levels = -scenario.deadlineOffset > 7 ? [1, 2] : [1];
    return levels.map((level) => ({
      caseId: "case-serikov",
      stepId: step.id,
      level,
      createdAt: new Date(`${addDays(step.deadline, level === 1 ? 1 : 8)}T04:00:00.000Z`),
    }));
  });
  await prisma.escalationEvent.createMany({ data: escalations });

  const omarovaStart = new Date(current.getTime() - 3 * DAY_MS);
  const omarovaPlan = buildPlan({ facts: OMAROVA_FACTS, draft: null, generatedBy: "rules", now: omarovaStart, visibleToFamily: true });
  await prisma.case.create({
    data: {
      id: "case-omarova",
      parentId: id("zhanna@example.kz"),
      childName: "Томирис",
      status: "plan_draft",
      facts: JSON.stringify(OMAROVA_FACTS),
      interview: JSON.stringify(buildInterview(OMAROVA_ANSWERS, OMAROVA_FACTS, omarovaStart, "kk")),
      plan: JSON.stringify(omarovaPlan),
      createdAt: omarovaStart,
    },
  });

  const events: Array<{ caseId: string | null; ownerId: string; type: string; title: string; startsAt: Date; endsAt: Date | null; notes: string | null }> = [];
  for (let offset = -3; offset <= 10; offset += 1) {
    const day = addDays(today, offset);
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    events.push({
      caseId: "case-serikov",
      ownerId: id("erlan@example.kz"),
      type: "meal",
      title: "Завтрак: каша без сахара, яблоко",
      startsAt: eventAt(day, "08:00"),
      endsAt: eventAt(day, "08:30"),
      notes: null,
    });
    events.push({
      caseId: "case-serikov",
      ownerId: id("erlan@example.kz"),
      type: "medication",
      title: "Витамин D (по назначению педиатра)",
      startsAt: eventAt(day, "09:00"),
      endsAt: null,
      notes: null,
    });
    if (weekday === 2 || weekday === 4) {
      events.push({
        caseId: "case-serikov",
        ownerId: id("erlan@example.kz"),
        type: "training",
        title: "АФК с Ержаном Касеновым",
        startsAt: eventAt(day, "17:00"),
        endsAt: eventAt(day, "17:45"),
        notes: "Взять сменную обувь",
      });
    }
    if (weekday === 1 || weekday === 3) {
      events.push({
        caseId: "case-serikov",
        ownerId: id("erlan@example.kz"),
        type: "specialist",
        title: "Логопед — Жанар Сапарова",
        startsAt: eventAt(day, "15:00"),
        endsAt: eventAt(day, "15:45"),
        notes: null,
      });
    }
    if (offset >= 0 && offset <= 6) {
      events.push({
        caseId: "case-akhmetov",
        ownerId: id("dinara@example.kz"),
        type: "meal",
        title: "Обед и дневной сон",
        startsAt: eventAt(day, "12:30"),
        endsAt: eventAt(day, "15:00"),
        notes: null,
      });
    }
  }
  events.push(
    {
      caseId: "case-serikov",
      ownerId: curatorId,
      type: "medical",
      title: "Невролог — плановый осмотр для ПМПК",
      startsAt: eventAt(addDays(today, 5), "10:30"),
      endsAt: eventAt(addDays(today, 5), "11:00"),
      notes: "Куратор записала семью",
    },
    {
      caseId: "case-serikov",
      ownerId: curatorId,
      type: "other",
      title: "Созвон куратора с семьёй Сериковых",
      startsAt: eventAt(addDays(today, 1), "18:00"),
      endsAt: eventAt(addDays(today, 1), "18:20"),
      notes: "Обсудить характеристику из детского сада",
    },
    {
      caseId: null,
      ownerId: curatorId,
      type: "other",
      title: "Звонок в ПМПК: запись Амины",
      startsAt: eventAt(addDays(today, 2), "11:00"),
      endsAt: eventAt(addDays(today, 2), "11:15"),
      notes: null,
    },
  );
  await prisma.calendarEvent.createMany({ data: events });

  await prisma.storedFile.create({
    data: {
      caseId: "case-serikov",
      uploaderId: id("erlan@example.kz"),
      category: "medical",
      documentId: "doc_specialists",
      title: "Заключения невролога и сурдолога",
      fileName: "zaklyuchenie-nevrolog-surdolog.pdf",
      mimeType: "application/pdf",
      ...pdfData(["AqylRoute - demo document", "Neurologist and audiologist conclusions", "Synthetic sample, no real patient data"]),
      createdAt: new Date(current.getTime() - 20 * DAY_MS),
    },
  });
  await prisma.storedFile.create({
    data: {
      caseId: "case-serikov",
      uploaderId: id("erlan@example.kz"),
      category: "photo",
      title: "Амина на занятии АФК",
      fileName: "amina-afk.png",
      mimeType: "image/png",
      ...pngData([20, 150, 140], [240, 200, 120]),
      createdAt: new Date(current.getTime() - 6 * DAY_MS),
    },
  });
}

function pdfData(lines: string[]) {
  const data = makePdf(lines);
  return { data: new Uint8Array(data), size: data.length };
}

function pngData(from: [number, number, number], to: [number, number, number]) {
  const data = makePng(320, 220, from, to);
  return { data: new Uint8Array(data), size: data.length };
}

function transliterate(value: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n",
    о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya",
    ь: "", ъ: "",
  };
  return value
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      const mapped = map[lower];
      if (mapped === undefined) {
        return char;
      }
      return char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
    })
    .join("");
}

export async function isDatabaseEmpty(): Promise<boolean> {
  return (await prisma.user.count()) === 0;
}
