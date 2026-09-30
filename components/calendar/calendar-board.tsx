"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_TYPES, type CalendarEventView, type EventType } from "@/lib/calendar-types";
import { errorMessage, postJson } from "@/lib/client-api";
import { addDays, formatDate, formatMonthYear, fromLocalDateTime, toDateOnly, toTimeOnly, weekdayShortNames } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { EVENT_STYLE } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Family = { id: string; childName: string };

type Props = {
  mode: "parent" | "curator";
  families?: Family[];
  fixedCaseId?: string;
};

const PERSONAL = "__personal";
const ALL = "__all";

function monthGrid(year: number, month: number): string[] {
  const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const weekday = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(first, -weekday);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((weekday + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => addDays(start, index));
}

export function CalendarBoard({ mode, families = [], fixedCaseId }: Props) {
  const { locale, t } = useI18n();
  const todayDate = toDateOnly(new Date());
  const [year, setYear] = useState(Number(todayDate.slice(0, 4)));
  const [month, setMonth] = useState(Number(todayDate.slice(5, 7)) - 1);
  const [selected, setSelected] = useState(todayDate);
  const [filter, setFilter] = useState<string>(fixedCaseId ?? ALL);
  const [events, setEvents] = useState<CalendarEventView[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "meal" as EventType,
    title: "",
    date: todayDate,
    start: "09:00",
    end: "",
    notes: "",
    repeat: "none" as "none" | "daily" | "weekly",
    repeatCount: "7",
    caseId: fixedCaseId ?? families[0]?.id ?? PERSONAL,
  });

  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const weekdays = useMemo(() => weekdayShortNames(locale), [locale]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = fromLocalDateTime(grid[0], "00:00").toISOString();
      const to = fromLocalDateTime(addDays(grid[grid.length - 1], 1), "00:00").toISOString();
      const params = new URLSearchParams({ from, to });
      const caseFilter = fixedCaseId ?? (filter !== ALL && filter !== PERSONAL ? filter : null);
      if (caseFilter) {
        params.set("caseId", caseFilter);
      }
      const response = await fetch(`/api/calendar?${params.toString()}`);
      const data = (await response.json()) as { events?: CalendarEventView[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      setEvents(filter === PERSONAL ? (data.events ?? []).filter((event) => !event.caseId) : data.events ?? []);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [grid, filter, fixedCaseId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        void load();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEventView[]>();
    for (const event of events) {
      const day = toDateOnly(new Date(event.startsAt));
      map.set(day, [...(map.get(day) ?? []), event]);
    }
    return map;
  }, [events]);

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  };

  const openDialog = () => {
    setForm((previous) => ({ ...previous, date: selected, title: "", notes: "", end: "" }));
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const startsAt = fromLocalDateTime(form.date, form.start).toISOString();
      const endsAt = form.end ? fromLocalDateTime(form.date, form.end).toISOString() : null;
      const caseId = fixedCaseId ?? (mode === "parent" ? null : form.caseId === PERSONAL ? null : form.caseId);
      const result = await postJson<{ created: number }>("/api/calendar", {
        caseId,
        type: form.type,
        title: form.title.trim(),
        startsAt,
        endsAt,
        notes: form.notes.trim() || null,
        repeat: form.repeat,
        repeatCount: Number(form.repeatCount) || 1,
      });
      toast.success(t.calendar.created(result.created));
      setDialogOpen(false);
      setSelected(form.date);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const response = await fetch(`/api/calendar/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error);
      }
      toast.success(t.calendar.deleted);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const dayEvents = byDay.get(selected) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label={t.calendar.prev}>
              <ChevronLeft />
            </Button>
            <h2 className="min-w-40 text-center font-semibold">{formatMonthYear(year, month, locale)}</h2>
            <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label={t.calendar.next}>
              <ChevronRight />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "curator" && !fixedCaseId ? (
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger size="sm" className="h-8 w-44 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t.calendar.allFamilies}</SelectItem>
                  <SelectItem value={PERSONAL}>{t.calendar.personal}</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.childName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                setYear(Number(todayDate.slice(0, 4)));
                setMonth(Number(todayDate.slice(5, 7)) - 1);
                setSelected(todayDate);
              }}
            >
              {t.calendar.today}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {weekdays.map((day) => (
            <div key={day} className="py-1 capitalize">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const inMonth = Number(day.slice(5, 7)) - 1 === month;
            const items = byDay.get(day) ?? [];
            const types = [...new Set(items.map((item) => item.type))].slice(0, 4);
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "flex aspect-square min-h-11 flex-col items-center justify-start gap-1 rounded-lg border p-1 text-sm transition sm:aspect-auto sm:min-h-20 sm:items-start sm:p-1.5",
                  inMonth ? "bg-white" : "bg-muted/40 text-muted-foreground",
                  day === selected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border",
                  day === todayDate && "font-bold text-primary",
                )}
              >
                <span>{Number(day.slice(8, 10))}</span>
                <span className="flex flex-wrap gap-0.5">
                  {types.map((type) => (
                    <span key={type} className={cn("size-1.5 rounded-full sm:size-2", EVENT_STYLE[type].dot)} />
                  ))}
                </span>
                {items.length > 0 ? <span className="hidden text-[10px] text-muted-foreground sm:block">{items.length}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {EVENT_TYPES.map((type) => (
            <span key={type} className="inline-flex items-center gap-1">
              <span className={cn("size-2 rounded-full", EVENT_STYLE[type].dot)} /> {t.calendar.types[type]}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{formatDate(selected, locale)}</h2>
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
        <Button className="h-10" onClick={openDialog}>
          <Plus /> {t.calendar.addEvent}
        </Button>
        {dayEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.calendar.noEvents}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {dayEvents.map((event) => (
              <li key={event.id} className={cn("rounded-xl border p-3 text-sm", EVENT_STYLE[event.type].chip)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <Clock className="size-3" />
                      {toTimeOnly(new Date(event.startsAt))}
                      {event.endsAt ? `–${toTimeOnly(new Date(event.endsAt))}` : ""} · {t.calendar.types[event.type]}
                    </div>
                    <div className="mt-1 font-semibold text-foreground">{event.title}</div>
                    {event.childName && mode === "curator" ? <div className="text-xs">{event.childName}</div> : null}
                    {event.notes ? <p className="mt-1 text-xs text-foreground/70">{event.notes}</p> : null}
                    <div className="mt-1 text-[11px] text-foreground/60">{t.calendar.addedBy(event.ownerName)}</div>
                  </div>
                  {event.canDelete ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-foreground/60 hover:text-red-700"
                      onClick={() => void remove(event.id)}
                      aria-label={t.common.delete}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.calendar.addEvent}</DialogTitle>
            <DialogDescription>{mode === "curator" ? t.calendar.curatorSubtitle : t.calendar.subtitle}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {mode === "curator" && !fixedCaseId ? (
              <div className="grid gap-1.5">
                <Label>{t.calendar.family}</Label>
                <Select value={form.caseId} onValueChange={(value) => setForm({ ...form, caseId: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PERSONAL}>{t.calendar.personal}</SelectItem>
                    {families.map((family) => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.childName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label>{t.calendar.eventType}</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as EventType })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t.calendar.types[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-title">{t.common.title}</Label>
              <Input
                id="ev-title"
                value={form.title}
                placeholder={t.calendar.titlePlaceholder}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 grid gap-1.5 sm:col-span-1">
                <Label htmlFor="ev-date">{t.common.date}</Label>
                <Input id="ev-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </div>
              <div className="grid gap-1.5 max-sm:col-span-1 sm:col-span-1">
                <Label htmlFor="ev-start">{t.calendar.start}</Label>
                <Input id="ev-start" type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ev-end">{t.calendar.end}</Label>
                <Input id="ev-end" type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>{t.calendar.repeat}</Label>
                <Select value={form.repeat} onValueChange={(value) => setForm({ ...form, repeat: value as typeof form.repeat })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.calendar.repeatNone}</SelectItem>
                    <SelectItem value="daily">{t.calendar.repeatDaily}</SelectItem>
                    <SelectItem value="weekly">{t.calendar.repeatWeekly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.repeat !== "none" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="ev-count">{t.calendar.repeatCount}</Label>
                  <Input
                    id="ev-count"
                    type="number"
                    min={1}
                    max={60}
                    value={form.repeatCount}
                    onChange={(event) => setForm({ ...form, repeatCount: event.target.value })}
                  />
                </div>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-notes">{t.common.notes}</Label>
              <Textarea id="ev-notes" rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving || !form.title.trim() || !form.date || !form.start} onClick={() => void save()}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
