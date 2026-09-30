export class ClientApiError extends Error {}

export async function postJson<T = unknown>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const issues = Array.isArray(data?.issues) && data.issues.length > 0 ? `: ${data.issues.join("; ")}` : "";
    throw new ClientApiError(`${data?.error ?? "Не удалось выполнить запрос"}${issues}`);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Что-то пошло не так";
}
