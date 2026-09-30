import { serviceIndex } from "@/lib/catalog";
import { L, type Localized } from "@/lib/i18n/locale";
import { activeRedFlags, type Facts, type RedFlag } from "@/lib/interview/facts";

export type Eligibility = {
  allowed: string[];
  done: string[];
  inProgress: string[];
  urgent: boolean;
  urgentServiceId: string | null;
  urgentReason: Localized | null;
};

export const RED_FLAG_LABELS: Record<Exclude<RedFlag, "none">, Localized> = {
  skill_loss: L("ребёнок перестал делать то, что уже умел", "бала бұрын істей алған нәрсесін істемей қалды"),
  self_harm: L("ребёнок причиняет себе вред", "бала өзіне зиян келтіреді"),
  aggression: L("сильная агрессия", "қатты агрессия"),
  seizures: L("судороги", "құрысулар"),
};

export function evaluateEligibility(facts: Facts): Eligibility {
  const age = facts.child_age_months;
  const confirmed = facts.diagnosis_status === "confirmed";
  const allowed = new Set<string>();
  const done = new Set<string>();
  const inProgress = new Set<string>();

  if (!confirmed) {
    allowed.add("med_pmsp_visit");
    if (age !== undefined && age >= 16 && age <= 30) {
      allowed.add("med_mchat");
    }
    ["med_hearing", "med_specialists", "med_psychiatrist_consult", "med_complex_assessment"].forEach((id) => allowed.add(id));
    ["edu_pmpk", "edu_kppk", "edu_support"].forEach((id) => allowed.add(id));
  } else {
    ["med_dynamic_observation", "med_specialists", "med_rehab_program", "med_rehab_course", "med_parent_training"].forEach((id) =>
      allowed.add(id),
    );
    allowed.add("edu_pmpk");
    allowed.add("edu_kppk");
    allowed.add(age !== undefined && age >= 72 ? "edu_school" : "edu_kindergarten");
    allowed.add("edu_support");
    if (facts.disability_status === "none" || facts.disability_status === undefined) {
      allowed.add("soc_vkk");
      allowed.add("soc_mse");
    }
    if (facts.disability_status === "in_process") {
      allowed.add("soc_vkk");
      allowed.add("soc_mse");
      done.add("soc_vkk");
      inProgress.add("soc_mse");
    }
    if (facts.disability_status === "established") {
      ["soc_ipr", "soc_benefit", "soc_caregiver_benefit", "soc_services_portal", "soc_special_services"].forEach((id) =>
        allowed.add(id),
      );
    }
  }

  if (facts.hearing_checked === "yes" && allowed.has("med_hearing")) {
    done.add("med_hearing");
  }
  if (facts.screening_done === "yes" && allowed.has("med_mchat")) {
    done.add("med_mchat");
  }
  if (facts.dynamic_observation === "yes" && allowed.has("med_dynamic_observation")) {
    done.add("med_dynamic_observation");
  }
  if (facts.specialists_done === "yes") {
    done.add("med_specialists");
  }
  if (facts.pmpk_status === "done") {
    done.add("edu_pmpk");
  }
  if (facts.correction_help === "kppk") {
    done.add("edu_kppk");
  }
  if (facts.vkk_done === "yes" && allowed.has("soc_vkk")) {
    done.add("soc_vkk");
  }
  if (confirmed && facts.disability_status === "established") {
    done.add("soc_vkk");
    done.add("soc_mse");
    allowed.add("soc_vkk");
    allowed.add("soc_mse");
  }
  if (confirmed && facts.disability_status === "established" && facts.ipr_benefits?.includes("ipr")) {
    done.add("soc_ipr");
  }
  if (confirmed && facts.disability_status === "established" && facts.ipr_benefits?.includes("benefits")) {
    done.add("soc_benefit");
    done.add("soc_caregiver_benefit");
  }

  const flags = activeRedFlags(facts);
  const urgent = flags.length > 0;
  const urgentServiceId = urgent ? (confirmed ? "med_dynamic_observation" : "med_psychiatrist_consult") : null;
  if (urgentServiceId) {
    allowed.add(urgentServiceId);
    done.delete(urgentServiceId);
  }
  const labels = flags.map((flag) => RED_FLAG_LABELS[flag as Exclude<RedFlag, "none">]);
  const urgentReason = urgent
    ? L(
        `В ответах есть признаки, о которых важно сообщить врачу в ближайшее время: ${labels.map((label) => label.ru).join(", ")}.`,
        `Жауаптарда жақын арада дәрігерге айту маңызды белгілер бар: ${labels.map((label) => label.kk).join(", ")}.`,
      )
    : null;

  const byCatalogOrder = (a: string, b: string) => serviceIndex(a) - serviceIndex(b);
  const doneList = [...done].filter((id) => allowed.has(id)).sort(byCatalogOrder);
  return {
    allowed: [...allowed].sort(byCatalogOrder),
    done: doneList,
    inProgress: [...inProgress].filter((id) => !done.has(id)).sort(byCatalogOrder),
    urgent,
    urgentServiceId,
    urgentReason,
  };
}
