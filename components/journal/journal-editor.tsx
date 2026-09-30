"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, postJson } from "@/lib/client-api";
import { toDateOnly, toTimeOnly } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { loadJournal } from "@/lib/journal";
import { MOODS, TRIGGERS, type Trigger } from "@/lib/journal-types";

type Journal = Awaited<ReturnType<typeof loadJournal>>;

export function JournalEditor({ days }: { days: Journal["days"] }) {
  const { t } = useI18n();
  const router = useRouter();
  const currentDay = toDateOnly(new Date());
  const [day, setDay] = useState(currentDay);
  const [sleep, setSleep] = useState("");
  const [mood, setMood] = useState("");
  const [notes, setNotes] = useState("");
  const [episodeDay, setEpisodeDay] = useState(currentDay);
  const [time, setTime] = useState(toTimeOnly(new Date()));
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState(2);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [before, setBefore] = useState("");
  const [behavior, setBehavior] = useState("");
  const [response, setResponse] = useState("");
  const [after, setAfter] = useState("");
  const [busy, setBusy] = useState(false);

  function selectDay(value: string) {
    setDay(value);
    const entry = days.find((item) => item.day === value);
    setSleep(entry?.sleepHours?.toString() ?? "");
    setMood(entry?.mood ?? "");
    setNotes(entry?.notes ?? "");
  }

  async function saveDaily(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await postJson("/api/journal", { kind: "daily", entry: { day, sleepHours: sleep === "" ? null : Number(sleep), mood: mood || null, notes } });
      toast.success(t.journal.saved);
      router.refresh();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function saveMeltdown(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await postJson("/api/journal", { kind: "meltdown", entry: { day: episodeDay, time, durationMinutes: duration === "" ? null : Number(duration), intensity, triggers, before, behavior, response, after } });
      toast.success(t.journal.saved);
      setDuration(""); setTriggers([]); setBefore(""); setBehavior(""); setResponse(""); setAfter("");
      router.refresh();
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={(event) => void saveDaily(event)} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div><h2 className="text-lg font-semibold">{t.journal.dailyTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{t.journal.dailyHint}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="journal-day">{t.journal.day}</Label><Input id="journal-day" type="date" value={day} max={currentDay} onChange={(event) => selectDay(event.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="journal-sleep">{t.journal.sleep}</Label><Input id="journal-sleep" type="number" min="0" max="24" step="0.5" value={sleep} onChange={(event) => setSleep(event.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="journal-mood">{t.journal.mood}</Label><select id="journal-mood" value={mood} onChange={(event) => setMood(event.target.value)} className="h-9 w-full rounded-lg border bg-background px-3 text-sm"><option value="">—</option>{MOODS.map((item) => <option key={item} value={item}>{t.journal.moods[item]}</option>)}</select></div>
        <div className="space-y-1.5"><Label htmlFor="journal-notes">{t.journal.dailyNotes}</Label><Textarea id="journal-notes" maxLength={2000} rows={4} placeholder={t.journal.dailyPlaceholder} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        <Button type="submit" disabled={busy}>{t.journal.saveDaily}</Button>
      </form>
      <form onSubmit={(event) => void saveMeltdown(event)} className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div><h2 className="text-lg font-semibold">{t.journal.meltdownTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{t.journal.meltdownHint}</p></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="episode-day">{t.journal.day}</Label><Input id="episode-day" type="date" value={episodeDay} max={currentDay} onChange={(event) => setEpisodeDay(event.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="episode-time">{t.journal.time}</Label><Input id="episode-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></div>
          <div className="space-y-1.5"><Label htmlFor="episode-duration">{t.journal.duration}</Label><Input id="episode-duration" type="number" min="1" max="1440" value={duration} onChange={(event) => setDuration(event.target.value)} /></div>
        </div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">{t.journal.intensity}</legend><div className="flex flex-wrap gap-2">{[1, 2, 3].map((value) => <label key={value} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${intensity === value ? "border-primary bg-primary/10 text-primary" : ""}`}><input type="radio" name="intensity" className="sr-only" checked={intensity === value} onChange={() => setIntensity(value)} />{t.journal.intensities[value - 1]}</label>)}</div></fieldset>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">{t.journal.triggersTitle}</legend><div className="flex flex-wrap gap-2">{TRIGGERS.map((trigger) => <label key={trigger} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${triggers.includes(trigger) ? "border-primary bg-primary/10 text-primary" : ""}`}><input type="checkbox" className="sr-only" checked={triggers.includes(trigger)} onChange={(event) => setTriggers(event.target.checked ? [...triggers, trigger] : triggers.filter((value) => value !== trigger))} />{t.journal.triggers[trigger]}</label>)}</div></fieldset>
        <div className="grid gap-3 sm:grid-cols-2">{(["before", "behavior", "response", "after"] as const).map((field) => {
          const values = { before, behavior, response, after };
          const setters = { before: setBefore, behavior: setBehavior, response: setResponse, after: setAfter };
          return <div key={field} className="space-y-1.5"><Label htmlFor={`episode-${field}`}>{t.journal[field]}</Label><Textarea id={`episode-${field}`} rows={2} maxLength={1000} value={values[field]} onChange={(event) => setters[field](event.target.value)} /></div>;
        })}</div>
        <Button type="submit" disabled={busy}>{t.journal.saveMeltdown}</Button>
      </form>
    </div>
  );
}
