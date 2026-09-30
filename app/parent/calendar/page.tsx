import { CalendarBoard } from "@/components/calendar/calendar-board";
import { requirePageUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function ParentCalendarPage() {
  await requirePageUser("parent");
  const { t } = await getI18n();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t.calendar.title}</h1>
        <p className="text-sm text-muted-foreground">{t.calendar.subtitle}</p>
      </div>
      <CalendarBoard mode="parent" />
    </div>
  );
}
