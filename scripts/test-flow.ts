import { allServiceIds } from "../lib/catalog";
import type { InterviewState } from "../lib/interview/engine";
import { findUnsafePhrases } from "../lib/plan/guard";
import type { CasePlan } from "../lib/plan/schema";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.SEED_PASSWORD ?? "Aqyl2026!";
const failures: string[] = [];

function check(condition: unknown, message: string) {
  process.stdout.write(`${condition ? "  ✔" : "  ✘"} ${message}\n`);
  if (!condition) {
    failures.push(message);
  }
}

function section(title: string) {
  process.stdout.write(`\n=== ${title}\n`);
}

class Client {
  cookies = new Map<string, string>();

  constructor(locale: "ru" | "kk" = "ru") {
    this.cookies.set("aqyl_lang", locale);
  }

  private header() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }

  private store(response: Response) {
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const [key, value] = pair.split("=");
      if (key === "aqyl_lang" && this.cookies.has("aqyl_lang")) {
        continue;
      }
      this.cookies.set(key.trim(), value);
    }
  }

  async raw(method: string, path: string, body?: unknown): Promise<Response> {
    const response = await fetch(`${BASE}${path}`, {
      method,
      redirect: "manual",
      headers: { cookie: this.header(), ...(body instanceof FormData ? {} : { "content-type": "application/json" }) },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
    this.store(response);
    return response;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.raw(method, path, body);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`${method} ${path} → ${response.status}: ${JSON.stringify(data)}`);
    }
    return data as T;
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }

  async login(email: string, password = PASSWORD) {
    return this.post<{ redirect: string }>("/api/auth/login", { email, password });
  }
}

type Answer = { values?: string[]; text?: string };
type CaseResponse = {
  case: { id: string; status: string; curatorName: string | null; facts?: Record<string, unknown>; plan: CasePlan | null };
  overdue: { stepId: string; serviceId: string; days: number; level: number }[];
};

async function runInterview(client: Client, answers: Record<string, Answer>) {
  let state = await client.get<InterviewState>("/api/interview");
  const transcript: string[] = [];
  for (let guard = 0; guard < 20 && !state.done && state.current; guard += 1) {
    const current = state.current;
    const answer = answers[current.slot] ?? { values: [current.options[0]?.value ?? "none"] };
    transcript.push(`${state.asked}. [${current.slot}] ${current.question} → ${answer.text ?? answer.values?.join(", ")}`);
    state = await client.post<InterviewState>("/api/interview/answer", { slot: current.slot, ...answer });
  }
  process.stdout.write(transcript.map((line) => `    ${line}`).join("\n") + "\n");
  return state;
}

function checkPlan(plan: CasePlan, label: string) {
  check(plan.steps.every((step) => allServiceIds.includes(step.serviceId)), `${label}: все шаги из справочника`);
  const texts = [plan.summary, plan.summaryKk, plan.urgentReason ?? "", ...plan.steps.flatMap((step) => [step.explanation, step.explanationKk])];
  const unsafe = texts.flatMap(findUnsafePhrases);
  check(unsafe.length === 0, `${label}: нет диагнозных формулировок${unsafe.length ? ` (${unsafe.join(", ")})` : ""}`);
  check(plan.steps.every((step) => step.explanationKk.length > 20), `${label}: у каждого шага есть объяснение на казахском`);
  check(plan.summaryKk.length > 20, `${label}: summary на казахском`);
}

async function main() {
  const stamp = Date.now();

  section("Регистрация и вход");
  const bad = await new Client("kk").raw("POST", "/api/auth/login", { email: "erlan@example.kz", password: "wrong-password" });
  const badBody = (await bad.json()) as { error: string };
  check(bad.status === 401 && badBody.error.includes("қате"), `неверный пароль → 401 на казахском: ${badBody.error}`);
  const noConsent = await new Client().raw("POST", "/api/auth/register", {
    role: "parent",
    name: "Тест",
    email: `noconsent${stamp}@example.kz`,
    password: "password123",
    childName: "Тест",
    acceptTerms: true,
    acceptPrivacy: false,
    legalRepresentative: true,
  });
  check(noConsent.status === 400, "без согласия на обработку данных регистрация невозможна");

  section("Родитель без куратора: интервью на русском, маршрут от AI сразу");
  const parent = new Client("ru");
  const registered = await parent.post<{ redirect: string }>("/api/auth/register", {
    role: "parent",
    name: "Айгуль Тестова",
    email: `parent${stamp}@example.kz`,
    password: "password123",
    childName: "Алихан",
    acceptTerms: true,
    acceptPrivacy: true,
    legalRepresentative: true,
  });
  check(registered.redirect === "/parent", "регистрация родителя ведёт в кабинет");
  const stateA = await runInterview(parent, {
    child_age_months: { text: "2 года 4 месяца" },
    main_concerns: { text: "Почти нет слов, не откликается на имя, выстраивает игрушки в ряд" },
    red_flags: { values: ["none"] },
    diagnosis_status: { text: "Нет, диагноз никто не ставил" },
    screening_done: { values: ["no"] },
    hearing_checked: { text: "Слух не проверяли" },
    pmpk_status: { values: ["none"] },
    correction_help: { values: ["none"] },
    education_place: { text: "Ходит в обычный детский сад" },
    specialists_done: { values: ["no"] },
    custom_diet: { values: ["selective"] },
    city: { text: "Караганда" },
  });
  check(stateA.done && stateA.asked >= 8 && stateA.asked <= 12, `интервью завершено за ${stateA.asked} вопросов (8–12)`);
  const generatedA = await parent.post<{ visibleToFamily: boolean; generatedBy: string }>(`/api/cases/${stateA.caseId}/generate`);
  check(generatedA.visibleToFamily, `без подписки маршрут виден семье сразу (собран: ${generatedA.generatedBy})`);
  const viewA = await parent.get<CaseResponse>(`/api/cases/${stateA.caseId}`);
  const planA = viewA.case.plan!;
  check(Boolean(planA), "родитель видит маршрут от AI");
  checkPlan(planA, "Маршрут без куратора");
  check(planA.steps.some((step) => step.serviceId === "med_mchat"), "M-CHAT в маршруте (2 года 4 месяца)");
  const own = planA.steps.find((step) => step.status !== "done")!;
  await parent.post(`/api/cases/${stateA.caseId}/actions`, { type: "setStatus", stepId: own.id, status: "in_progress" });
  const moved = await parent.post<{ plan: CasePlan }>(`/api/cases/${stateA.caseId}/actions`, {
    type: "moveDeadline",
    stepId: own.id,
    deadline: new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10),
    reason: "Запись только через месяц",
  });
  check(moved.plan.steps.find((step) => step.id === own.id)?.status === "in_progress", "без куратора родитель сам ведёт статусы и сроки");
  const curatorOnly = await parent.raw("GET", "/api/cases");
  check(curatorOnly.status === 403, "родителю недоступен список семей куратора");

  section("Родитель на казахском: интервью, подписка, куратор");
  const dinara = new Client("kk");
  await dinara.login("dinara@example.kz");
  const stateB = await runInterview(dinara, {
    child_age_months: { text: "2 жас 4 ай" },
    main_concerns: { text: "Сөйлемейді, атына қарамайды, ойыншықтарды қатарға тізеді" },
    red_flags: { values: ["none"] },
    diagnosis_status: { text: "Жоқ, диагноз қойылған жоқ" },
    screening_done: { values: ["no"] },
    hearing_checked: { text: "Жоқ, тексермедік" },
    pmpk_status: { values: ["none"] },
    correction_help: { values: ["none"] },
    education_place: { text: "Балабақшаға барады" },
    city: { text: "Қарағанды" },
  });
  const factsB = await (async () => {
    const buy = await dinara.post<{ ok: boolean }>("/api/subscription", { plan: "month", acceptCurator: true });
    check(buy.ok, "подписка на куратора оформлена (тестовая оплата)");
    return stateB;
  })();
  check(factsB.done, `интервью на казахском завершено за ${factsB.asked} вопросов`);
  const genB = await dinara.post<{ visibleToFamily: boolean }>(`/api/cases/${stateB.caseId}/generate`);
  check(!genB.visibleToFamily, "с куратором маршрут скрыт от семьи до подтверждения");
  const hidden = await dinara.get<CaseResponse>(`/api/cases/${stateB.caseId}`);
  check(hidden.case.plan === null && Boolean(hidden.case.curatorName), `куратор назначен: ${hidden.case.curatorName}`);

  const curators = ["curator@aqylroute.kz", "curator2@aqylroute.kz", "curator3@aqylroute.kz"];
  let assigned: Client | null = null;
  for (const email of curators) {
    const client = new Client("ru");
    await client.login(email);
    const list = await client.get<{ cases: { id: string }[] }>("/api/cases");
    if (list.cases.some((item) => item.id === stateB.caseId)) {
      assigned = client;
      process.stdout.write(`    кейс у куратора ${email}\n`);
    }
  }
  check(Boolean(assigned), "кейс появился у назначенного куратора");
  const curatorView = await assigned!.get<CaseResponse>(`/api/cases/${stateB.caseId}`);
  const factsKk = curatorView.case.facts ?? {};
  process.stdout.write(`    facts: ${JSON.stringify(factsKk)}\n`);
  check(factsKk.child_age_months === 28, "возраст «2 жас 4 ай» распознан как 28 месяцев");
  check(factsKk.hearing_checked === "no", "«тексермедік» распознано как «слух не проверяли»");
  checkPlan(curatorView.case.plan!, "План для куратора");
  const firstStep = curatorView.case.plan!.steps.find((step) => step.status !== "done")!;
  await assigned!.post(`/api/cases/${stateB.caseId}/actions`, {
    type: "updateStep",
    stepId: firstStep.id,
    explanationKk: "Педиатр баланың дамуын бағалап, қажетті мамандарға жолдама береді.",
  });
  const approved = await assigned!.post<{ status: string }>(`/api/cases/${stateB.caseId}/actions`, { type: "approve" });
  check(approved.status === "approved", "куратор подтвердил план");
  const visible = await dinara.get<CaseResponse>(`/api/cases/${stateB.caseId}`);
  check(Boolean(visible.case.plan?.approved), "после подтверждения семья видит маршрут");
  const denied = await dinara.raw("POST", `/api/cases/${stateB.caseId}/actions`, { type: "setStatus", stepId: firstStep.id, status: "done" });
  check(denied.status === 403, "с куратором статусы ведёт куратор, а не родитель");

  section("Сериковы: просрочки и эскалации у куратора");
  const aigerim = new Client("ru");
  await aigerim.login("curator@aqylroute.kz");
  const serikov = await aigerim.get<CaseResponse>("/api/cases/case-serikov");
  process.stdout.write(`    ${serikov.overdue.map((item) => `${item.serviceId}: ${item.days} дн., уровень ${item.level}`).join("\n    ")}\n`);
  check(
    serikov.overdue.some((item) => item.serviceId === "edu_pmpk" && item.level === 2) &&
      serikov.overdue.some((item) => item.serviceId === "soc_vkk" && item.level === 1),
    "ПМПК — эскалация уровня 2, ВКК — уровень 1",
  );

  section("Календарь");
  const erlan = new Client("ru");
  await erlan.login("erlan@example.kz");
  const start = new Date(Date.now() + 86_400_000);
  start.setUTCHours(3, 0, 0, 0);
  const created = await erlan.post<{ created: number }>("/api/calendar", {
    caseId: null,
    type: "meal",
    title: "Полдник: йогурт",
    startsAt: start.toISOString(),
    endsAt: null,
    notes: null,
    repeat: "daily",
    repeatCount: 3,
  });
  check(created.created === 3, "родитель добавил приём пищи с повтором на 3 дня");
  const from = new Date(Date.now() - 86_400_000).toISOString();
  const to = new Date(Date.now() + 5 * 86_400_000).toISOString();
  const curatorEvents = await aigerim.get<{ events: { title: string }[] }>(`/api/calendar?from=${from}&to=${to}&caseId=case-serikov`);
  check(curatorEvents.events.filter((event) => event.title === "Полдник: йогурт").length === 3, "куратор видит события семьи в календаре");
  await aigerim.post("/api/calendar", {
    caseId: "case-serikov",
    type: "training",
    title: "АФК: пробное занятие",
    startsAt: start.toISOString(),
    endsAt: null,
    notes: null,
    repeat: "none",
    repeatCount: 1,
  });
  const parentEvents = await erlan.get<{ events: { title: string }[] }>(`/api/calendar?from=${from}&to=${to}`);
  check(parentEvents.events.some((event) => event.title === "АФК: пробное занятие"), "родитель видит событие, которое добавил куратор");

  section("Хранилище документов");
  const form = new FormData();
  form.set("file", new File([new TextEncoder().encode("%PDF-1.4\n% AqylRoute test\n")], "hearing.pdf", { type: "application/pdf" }));
  form.set("category", "medical");
  form.set("title", "Результат проверки слуха");
  form.set("documentId", "doc_parent_id");
  const uploaded = await parent.request<{ file: { id: string } }>("POST", "/api/files", form);
  check(Boolean(uploaded.file.id), "родитель загрузил документ в хранилище");
  const afterUpload = await parent.get<CaseResponse>(`/api/cases/${stateA.caseId}`);
  check(
    afterUpload.case.plan!.steps.some((step) => step.documents.some((document) => document.id === "doc_parent_id" && document.ready)),
    "документ отмечен готовым в шагах маршрута",
  );
  const foreign = await erlan.raw("GET", `/api/files/${uploaded.file.id}`);
  check(foreign.status === 404, "чужой родитель не может открыть файл");
  const serikovFiles = await aigerim.get<{ files: { id: string }[] }>("/api/files?caseId=case-serikov");
  check(serikovFiles.files.length >= 2, "куратор видит хранилище своей семьи");

  section("Специалист, комиссия, отзывы, модерация");
  const specialist = new Client("kk");
  await specialist.post("/api/auth/register", {
    role: "specialist",
    name: "Тест Маманов",
    email: `specialist${stamp}@example.kz`,
    password: "password123",
    acceptTerms: true,
    acceptPrivacy: true,
    accurateInfo: true,
    profile: {
      category: "trainer",
      city: "Караганда",
      experienceYears: 5,
      aboutRu: "Тренер по адаптивной физкультуре для детей с особенностями развития.",
      aboutKk: "Даму ерекшеліктері бар балаларға арналған бейімделген дене шынықтыру жаттықтырушысы.",
      education: "КазАСТ, адаптивная физкультура",
      priceKzt: 5000,
      formats: ["offline"],
      languages: ["kk", "ru"],
      contact: "+7 700 111 22 33",
    },
  });
  const before = await new Client().get<{ specialists: { name: string }[] }>("/api/specialists");
  check(!before.specialists.some((item) => item.name === "Тест Маманов"), "новая анкета не видна в каталоге до проверки");
  const commission = new Client("ru");
  await commission.login("commission@aqylroute.kz");
  const pendingPage = await commission.raw("GET", "/commission?status=pending");
  const pendingHtml = await pendingPage.text();
  const match = pendingHtml.match(/href="\/commission\/([a-z0-9]+)"[^>]*>Тест Маманов/);
  check(Boolean(match), "заявка появилась у комиссии");
  if (match) {
    await commission.post(`/api/commission/${match[1]}`, { decision: "approved" });
  }
  const after = await new Client().get<{ specialists: { id: string; name: string }[] }>("/api/specialists");
  const approvedSpecialist = after.specialists.find((item) => item.name === "Тест Маманов");
  check(Boolean(approvedSpecialist), "после одобрения комиссией анкета в каталоге");
  const review = await erlan.post<{ review: { id: string; status: string } }>(`/api/specialists/${approvedSpecialist!.id}/reviews`, {
    rating: 5,
    text: "Отличный тренер, ребёнок занимается с удовольствием.",
  });
  check(review.review.status === "pending", "отзыв родителя ушёл на модерацию");
  const moderator = new Client("ru");
  await moderator.login("moderator@aqylroute.kz");
  await moderator.post(`/api/moderation/reviews/${review.review.id}`, { decision: "approved" });
  const withReview = await new Client().get<{ specialists: { id: string; reviewsCount: number }[] }>("/api/specialists");
  check(withReview.specialists.find((item) => item.id === approvedSpecialist!.id)?.reviewsCount === 1, "после модерации отзыв опубликован");

  section("Администратор: вопросы интервью");
  const admin = new Client("ru");
  await admin.login("admin@aqylroute.kz");
  const createdQuestion = await admin.post<{ id: string }>("/api/admin/questions", {
    kind: "single",
    required: false,
    questionRu: "Есть ли у ребёнка братья или сёстры?",
    questionKk: "Баланың аға-інілері немесе апа-сіңлілері бар ма?",
    options: [
      { labelRu: "Да", labelKk: "Иә" },
      { labelRu: "Нет", labelKk: "Жоқ" },
    ],
  });
  check(createdQuestion.id.startsWith("custom_"), "администратор добавил свой вопрос на двух языках");
  const locked = await admin.raw("PATCH", "/api/admin/questions/red_flags", { active: false });
  check(locked.status === 400, "обязательный встроенный вопрос отключить нельзя");
  const deleted = await admin.raw("DELETE", `/api/admin/questions/${createdQuestion.id}`);
  check(deleted.status === 200, "свой вопрос удалён");

  section("Юридические документы");
  const termsKk = await (await new Client("kk").raw("GET", "/legal/terms")).text();
  check(termsKk.includes("Пайдаланушы келісімі"), "пользовательское соглашение на казахском");
  const curatorRu = await (await new Client("ru").raw("GET", "/legal/curator")).text();
  check(curatorRu.includes("Соглашение об услугах куратора"), "соглашение об услугах куратора на русском");

  process.stdout.write(`\n${failures.length === 0 ? "ВСЁ ПРОШЛО" : `ОШИБКИ: ${failures.length}\n- ${failures.join("\n- ")}`}\n`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
