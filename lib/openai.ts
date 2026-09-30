import OpenAI from "openai";

let client: OpenAI | null = null;

export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.DEMO_RULES_ONLY !== "true";
}

export function getOpenAI(): OpenAI | null {
  if (!isAiEnabled()) {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function openaiModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

export function samplingParams(
  temperature: number,
): { temperature?: number; seed?: number; reasoning_effort?: "low" } {
  const model = openaiModel();
  if (/^(o\d|gpt-5)/.test(model)) {
    return { seed: 42, reasoning_effort: "low" };
  }
  return { temperature, seed: 42 };
}
