"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";

type Specialist = { id: string; name: string };

export function JournalSharing({ specialists, shared }: { specialists: Specialist[]; shared: Specialist[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const available = specialists.filter((item) => !shared.some((access) => access.id === item.id));
  const [selection, setSelection] = useState(available[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function change(specialistId: string, method: "POST" | "DELETE") {
    setBusy(true);
    try {
      if (method === "POST") await postJson("/api/journal/share", { specialistId });
      else {
        const response = await fetch("/api/journal/share", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ specialistId }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
      }
      toast.success(t.journal.saved);
      router.refresh();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{t.journal.shareTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.journal.shareHint}</p>
      {shared.length > 0 ? <div className="mt-4"><h3 className="text-sm font-medium">{t.journal.sharedWith}</h3><ul className="mt-2 flex flex-wrap gap-2">{shared.map((item) => <li key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">{item.name}<Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void change(item.id, "DELETE")}>{t.journal.revoke}</Button></li>)}</ul></div> : null}
      {available.length > 0 ? <div className="mt-4 flex flex-wrap gap-2"><select value={available.some((item) => item.id === selection) ? selection : available[0].id} onChange={(event) => setSelection(event.target.value)} className="h-9 min-w-52 rounded-lg border bg-background px-3 text-sm" aria-label={t.journal.shareTitle}>{available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Button type="button" disabled={busy} onClick={() => void change(available.some((item) => item.id === selection) ? selection : available[0].id, "POST")}>{t.journal.share}</Button></div> : specialists.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t.journal.noSpecialists}</p> : null}
    </section>
  );
}
