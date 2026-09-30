"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/client-api";
import { formatDate, formatDateTime, toDateOnly } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { loadJournal } from "@/lib/journal";

type Journal = Awaited<ReturnType<typeof loadJournal>>;

export function JournalHistory({ journal, editable = false }: { journal: Journal; editable?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const maxCount = Math.max(1, ...journal.triggerCounts.map((item) => item.count));
  const episodesByDay = journal.meltdowns.reduce<Record<string, number>>((counts, episode) => {
    const day = toDateOnly(new Date(episode.occurredAt));
    counts[day] = (counts[day] ?? 0) + 1;
    return counts;
  }, {});

  async function remove(id: string) {
    setRemoving(id);
    try {
      const response = await fetch("/api/journal", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      toast.success(t.journal.deleted);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{t.journal.patterns}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.journal.patternsHint}</p>
        {journal.triggerCounts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t.journal.noEpisodes}</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {journal.triggerCounts.map(({ trigger, count }) => (
              <div key={trigger} className="space-y-1.5">
                <div className="flex justify-between gap-3 text-sm"><span>{t.journal.triggers[trigger]}</span><span className="font-medium">{t.journal.count(count)}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t.journal.episodes} ({journal.meltdowns.length})</h2>
          {journal.meltdowns.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t.journal.noEpisodes}</p> : (
            <ol className="mt-3 max-h-[720px] space-y-3 overflow-y-auto">
              {journal.meltdowns.map((episode) => (
                <li key={episode.id} className="rounded-xl border p-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{formatDateTime(episode.occurredAt)} · {t.journal.intensities[episode.intensity - 1]}</div>
                    {editable ? <Button type="button" variant="ghost" size="icon-sm" disabled={removing === episode.id} onClick={() => void remove(episode.id)} aria-label={t.common.delete}><Trash2 className="size-4" /></Button> : null}
                  </div>
                  {episode.durationMinutes ? <p className="mt-1 text-muted-foreground">{t.journal.duration}: {t.journal.minutes(episode.durationMinutes)}</p> : null}
                  {episode.triggers.length > 0 ? <div className="mt-2 flex flex-wrap gap-1.5">{episode.triggers.map((trigger) => <span key={trigger} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t.journal.triggers[trigger]}</span>)}</div> : null}
                  {["before", "behavior", "response", "after"].map((field) => episode[field as "before" | "behavior" | "response" | "after"] ? (
                    <p key={field} className="mt-2"><span className="font-medium">{t.journal[field as "before" | "behavior" | "response" | "after"]}: </span>{episode[field as "before" | "behavior" | "response" | "after"]}</p>
                  ) : null)}
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t.journal.dailyHistory} ({journal.days.length})</h2>
          {journal.days.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t.journal.noDays}</p> : (
            <ol className="mt-3 max-h-[720px] space-y-3 overflow-y-auto">
              {journal.days.map((entry) => (
                <li key={entry.day} className="rounded-xl border p-4 text-sm">
                  <div className="font-medium">{formatDate(entry.day, locale)}</div>
                  <div className="mt-1 text-muted-foreground">{t.journal.episodesToday(episodesByDay[entry.day] ?? 0)}</div>
                  <div className="mt-1 text-muted-foreground">
                    {entry.mood ? t.journal.moods[entry.mood] : null}
                    {entry.sleepHours !== null ? `${entry.mood ? " · " : ""}${t.journal.sleep}: ${entry.sleepHours}` : null}
                  </div>
                  {entry.notes ? <p className="mt-2 whitespace-pre-wrap">{entry.notes}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
