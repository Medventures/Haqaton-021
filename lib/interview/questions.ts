import { z } from "zod";
import { prisma } from "@/lib/db";
import { BUILTIN_SLOTS, getBuiltInSlot, type QuestionDef, type QuestionOption, type SlotKind } from "@/lib/interview/slots";

export const questionOptionSchema = z.object({
  value: z.string().min(1).max(40),
  labelRu: z.string().trim().min(1).max(120),
  labelKk: z.string().trim().min(1).max(120),
});

const optionsSchema = z.array(questionOptionSchema);

export type StoredOption = z.infer<typeof questionOptionSchema>;

export function toStoredOptions(options: QuestionOption[]): StoredOption[] {
  return options.map((option) => ({ value: option.value, labelRu: option.label.ru, labelKk: option.label.kk }));
}

function parseOptions(raw: string): StoredOption[] {
  try {
    const parsed = optionsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function ensureBuiltInQuestions(): Promise<void> {
  const existing = new Set((await prisma.interviewQuestion.findMany({ select: { id: true } })).map((row) => row.id));
  const missing = BUILTIN_SLOTS.map((slot, index) => ({ slot, index })).filter(({ slot }) => !existing.has(slot.id));
  for (const { slot, index } of missing) {
    await prisma.interviewQuestion.create({
      data: {
        id: slot.id,
        builtIn: true,
        kind: slot.kind,
        required: slot.required,
        active: true,
        sortOrder: (index + 1) * 10,
        questionRu: slot.question.ru,
        questionKk: slot.question.kk,
        options: JSON.stringify(toStoredOptions(slot.options)),
      },
    });
  }
}

export async function loadQuestionDefs(): Promise<QuestionDef[]> {
  const rows = await prisma.interviewQuestion.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const defs: QuestionDef[] = [];
  BUILTIN_SLOTS.forEach((slot, index) => {
    const row = byId.get(slot.id);
    const stored = row ? parseOptions(row.options) : [];
    defs.push({
      ...slot,
      builtIn: true,
      required: slot.required,
      active: slot.required ? true : (row?.active ?? true),
      sortOrder: row?.sortOrder ?? (index + 1) * 10,
      question: { ru: row?.questionRu || slot.question.ru, kk: row?.questionKk || slot.question.kk },
      options: slot.options.map((option) => {
        const override = stored.find((candidate) => candidate.value === option.value);
        return { value: option.value, label: { ru: override?.labelRu || option.label.ru, kk: override?.labelKk || option.label.kk } };
      }),
    });
  });
  for (const row of rows) {
    if (row.builtIn || getBuiltInSlot(row.id)) {
      continue;
    }
    const kind = (["single", "multi", "text"].includes(row.kind) ? row.kind : "text") as SlotKind;
    defs.push({
      id: row.id,
      builtIn: false,
      kind,
      required: row.required,
      active: row.active,
      sortOrder: row.sortOrder,
      question: { ru: row.questionRu, kk: row.questionKk },
      purpose: row.questionRu,
      options: parseOptions(row.options).map((option) => ({ value: option.value, label: { ru: option.labelRu, kk: option.labelKk } })),
      when: () => true,
      fallback: undefined,
    });
  }
  return defs.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}
