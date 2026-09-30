import { toDateOnly } from "@/lib/dates";

export async function now(): Promise<Date> {
  return new Date();
}

export async function today(): Promise<string> {
  return toDateOnly(new Date());
}
