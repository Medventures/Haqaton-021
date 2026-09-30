import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReviewStatusBadge } from "@/components/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePageUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { SPECIALIST_CATEGORIES } from "@/lib/specialists";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS = ["pending", "approved", "rejected", "all"] as const;

export default async function CommissionPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requirePageUser("commission");
  const [{ t }, params] = await Promise.all([getI18n(), searchParams]);
  const filter = FILTERS.includes(params.status as (typeof FILTERS)[number]) ? (params.status as (typeof FILTERS)[number]) : "pending";
  const [profiles, pendingCount] = await Promise.all([
    prisma.specialistProfile.findMany({
      where: filter === "all" ? {} : { status: filter },
      include: { user: { select: { name: true, email: true } }, _count: { select: { files: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.specialistProfile.count({ where: { status: "pending" } }),
  ]);
  const categoryLabel = (value: string) =>
    SPECIALIST_CATEGORIES.includes(value as (typeof SPECIALIST_CATEGORIES)[number])
      ? t.specialists.categories[value as (typeof SPECIALIST_CATEGORIES)[number]]
      : value;

  return (
    <AppShell user={user} badges={{ pending: pendingCount }}>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold">{t.commission.title}</h1>
          <p className="text-sm text-muted-foreground">{t.commission.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Link
              key={item}
              href={`/commission?status=${item}`}
              className={cn(
                "inline-flex h-9 items-center rounded-full border bg-white px-4 text-sm font-medium hover:bg-muted",
                filter === item && "border-primary bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {t.commission.filters[item]}
              {item === "pending" && pendingCount > 0 ? ` · ${pendingCount}` : ""}
            </Link>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.commission.applicant}</TableHead>
                <TableHead>{t.specialistCabinet.category}</TableHead>
                <TableHead>{t.specialistCabinet.city}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>{t.commission.submitted}</TableHead>
                <TableHead>{t.specialistCabinet.credentials}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {t.common.empty}
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => (
                  <TableRow key={profile.id} className="relative">
                    <TableCell>
                      <Link href={`/commission/${profile.id}`} className="font-medium after:absolute after:inset-0 hover:text-primary">
                        {profile.user.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{profile.user.email}</div>
                    </TableCell>
                    <TableCell>{categoryLabel(profile.category)}</TableCell>
                    <TableCell>{profile.city}</TableCell>
                    <TableCell>
                      <ReviewStatusBadge
                        status={profile.status}
                        label={t.commission.statuses[profile.status as "pending" | "approved" | "rejected"] ?? profile.status}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateTime(profile.updatedAt)}</TableCell>
                    <TableCell>{profile._count.files}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
