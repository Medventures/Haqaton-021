import { z } from "zod";
import { factsSchema } from "@/lib/interview/facts";

export const turnSchema = z.object({
  slot: z.string().min(1).max(60),
  question: z.string(),
  empathy: z.string().nullable(),
  options: z.array(z.object({ value: z.string(), label: z.string() })),
  kind: z.enum(["single", "multi", "age", "text"]),
  source: z.enum(["ai", "rules"]),
  locale: z.enum(["ru", "kk"]).default("ru"),
  askedAt: z.iso.datetime(),
  answer: z
    .object({
      text: z.string(),
      values: z.array(z.string()).nullable(),
      at: z.iso.datetime(),
    })
    .nullable(),
  extracted: factsSchema.nullable(),
  alert: z.boolean(),
});

export const interviewSchema = z.array(turnSchema);

export type InterviewTurn = z.infer<typeof turnSchema>;
