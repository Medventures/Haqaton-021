import { requireService } from "@/lib/catalog";
import { L, type Localized } from "@/lib/i18n/locale";
import type { Priority, Responsible } from "@/lib/plan/schema";

type ServiceDefaults = {
  priority: Priority;
  responsible: Responsible;
  outcome: Localized;
};

export const SERVICE_DEFAULTS: Record<string, ServiceDefaults> = {
  med_pmsp_visit: {
    priority: "high",
    responsible: "parent",
    outcome: L(
      "На выходе — направление к нужным специалистам и понятный следующий шаг.",
      "Нәтижесінде — қажетті мамандарға жолдама және түсінікті келесі қадам.",
    ),
  },
  med_mchat: {
    priority: "high",
    responsible: "parent",
    outcome: L(
      "На выходе — результат опросника, который поможет врачу решить, нужна ли дальнейшая оценка.",
      "Нәтижесінде — дәрігерге әрі қарай бағалау керек пе, соны шешуге көмектесетін сауалнама нәтижесі.",
    ),
  },
  med_hearing: {
    priority: "high",
    responsible: "parent",
    outcome: L(
      "На выходе — результат проверки слуха, он понадобится для консультаций и ПМПК.",
      "Нәтижесінде — кеңестер мен ПМПК үшін қажет болатын есту қабілетін тексеру нәтижесі.",
    ),
  },
  med_specialists: {
    priority: "medium",
    responsible: "parent",
    outcome: L("На выходе — заключения невролога, офтальмолога и сурдолога.", "Нәтижесінде — невролог, офтальмолог және сурдолог қорытындылары."),
  },
  med_psychiatrist_consult: {
    priority: "high",
    responsible: "parent",
    outcome: L(
      "На выходе — рекомендации специалиста и, если нужно, направление на углублённую оценку.",
      "Нәтижесінде — маманның ұсынымдары және қажет болса, тереңдетілген бағалауға жолдама.",
    ),
  },
  med_complex_assessment: {
    priority: "medium",
    responsible: "organization",
    outcome: L(
      "На выходе — заключение специалистов и рекомендации по дальнейшей помощи.",
      "Нәтижесінде — мамандардың қорытындысы және әрі қарайғы көмек бойынша ұсынымдар.",
    ),
  },
  med_dynamic_observation: {
    priority: "high",
    responsible: "parent",
    outcome: L(
      "На выходе — регулярная связь с врачом и актуальные рекомендации.",
      "Нәтижесінде — дәрігермен тұрақты байланыс және өзекті ұсынымдар.",
    ),
  },
  med_rehab_program: {
    priority: "medium",
    responsible: "organization",
    outcome: L(
      "На выходе — письменный план помощи: какие занятия нужны и как часто.",
      "Нәтижесінде — жазбаша көмек жоспары: қандай сабақтар және қаншалықты жиі қажет.",
    ),
  },
  med_rehab_course: {
    priority: "medium",
    responsible: "parent",
    outcome: L(
      "На выходе — пройденный курс занятий и рекомендации на следующий период.",
      "Нәтижесінде — өтілген сабақтар курсы және келесі кезеңге ұсынымдар.",
    ),
  },
  med_parent_training: {
    priority: "medium",
    responsible: "parent",
    outcome: L(
      "На выходе — понятные приёмы, которые помогают ребёнку дома и снижают стресс семьи.",
      "Нәтижесінде — балаға үйде көмектесетін және отбасының күйзелісін азайтатын түсінікті тәсілдер.",
    ),
  },
  edu_pmpk: {
    priority: "high",
    responsible: "parent",
    outcome: L(
      "На выходе — заключение ПМПК: какие условия обучения и какие специалисты нужны ребёнку.",
      "Нәтижесінде — ПМПК қорытындысы: балаға қандай оқу жағдайлары мен мамандар қажет.",
    ),
  },
  edu_kppk: {
    priority: "medium",
    responsible: "parent",
    outcome: L("На выходе — регулярные бесплатные занятия со специалистами.", "Нәтижесінде — мамандармен тұрақты тегін сабақтар."),
  },
  edu_kindergarten: {
    priority: "medium",
    responsible: "curator",
    outcome: L("На выходе — место в группе, где есть условия для ребёнка.", "Нәтижесінде — бала үшін жағдайы бар топтан орын."),
  },
  edu_school: {
    priority: "medium",
    responsible: "curator",
    outcome: L("На выходе — место в школе с условиями по рекомендациям ПМПК.", "Нәтижесінде — ПМПК ұсынымдарына сай жағдайы бар мектептен орын."),
  },
  edu_support: {
    priority: "low",
    responsible: "organization",
    outcome: L(
      "На выходе — специалисты, которые помогают ребёнку прямо в саду или школе.",
      "Нәтижесінде — балаға балабақшада немесе мектепте тікелей көмектесетін мамандар.",
    ),
  },
  soc_vkk: {
    priority: "medium",
    responsible: "parent",
    outcome: L(
      "На выходе — решение врачей, есть ли основания для направления на МСЭ.",
      "Нәтижесінде — МӘС-ке жолдауға негіз бар-жоғы туралы дәрігерлердің шешімі.",
    ),
  },
  soc_mse: {
    priority: "medium",
    responsible: "parent",
    outcome: L("На выходе — решение комиссии по вопросу инвалидности.", "Нәтижесінде — мүгедектік мәселесі бойынша комиссия шешімі."),
  },
  soc_ipr: {
    priority: "medium",
    responsible: "organization",
    outcome: L(
      "На выходе — ИПР со списком положенных ребёнку услуг и средств реабилитации.",
      "Нәтижесінде — балаға тиесілі қызметтер мен оңалту құралдарының тізімі бар ОЖБ.",
    ),
  },
  soc_benefit: {
    priority: "high",
    responsible: "parent",
    outcome: L("На выходе — назначенная ежемесячная выплата на ребёнка.", "Нәтижесінде — балаға тағайындалған ай сайынғы төлем."),
  },
  soc_caregiver_benefit: {
    priority: "high",
    responsible: "parent",
    outcome: L("На выходе — назначенная ежемесячная выплата родителю.", "Нәтижесінде — ата-анаға тағайындалған ай сайынғы төлем."),
  },
  soc_services_portal: {
    priority: "low",
    responsible: "parent",
    outcome: L("На выходе — выбранные услуги и поставщики по ИПР.", "Нәтижесінде — ОЖБ бойынша таңдалған қызметтер мен жеткізушілер."),
  },
  soc_special_services: {
    priority: "low",
    responsible: "curator",
    outcome: L(
      "На выходе — подключённые социальные услуги: дневное пребывание, помощь на дому или реабилитация.",
      "Нәтижесінде — қосылған әлеуметтік қызметтер: күндізгі болу, үйдегі көмек немесе оңалту.",
    ),
  },
};

export function defaultsFor(serviceId: string): ServiceDefaults {
  return SERVICE_DEFAULTS[serviceId] ?? { priority: "medium", responsible: "parent", outcome: L("", "") };
}

export function templateExplanation(serviceId: string): Localized {
  const service = requireService(serviceId);
  const outcome = defaultsFor(serviceId).outcome;
  return {
    ru: `${service.description} ${outcome.ru}`.trim(),
    kk: `${service.descriptionKk} ${outcome.kk}`.trim(),
  };
}
