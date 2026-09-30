import { CalendarBoard } from "@/components/calendar/calendar-board";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";

export default async function CuratorCalendarPage() {
  const user = await requirePageUser("curator");
  const { t } = await getI18n();
  const families = await prisma.case.findMany({ where: { curatorId: user.id }, select: { id: true, childName: true }, orderBy: { childName: "asc" } });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t.calendar.title}</h1>
        <p className="text-sm text-muted-foreground">{t.calendar.curatorSubtitle}</p>
      </div>
      <CalendarBoard mode="curator" families={families} />
    </div>
  );
}
