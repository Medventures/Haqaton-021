import { AppShell } from "@/components/app-shell";
import { UsersManager } from "@/components/admin/users-manager";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { isRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requirePageUser("admin");
  const { t } = await getI18n();
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  return (
    <AppShell user={user}>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t.admin.usersTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.admin.usersSubtitle}</p>
        </div>
        <UsersManager
          currentUserId={user.id}
          users={users
            .filter((item) => isRole(item.role))
            .map((item) => ({
              id: item.id,
              name: item.name,
              email: item.email,
              role: item.role as never,
              status: item.status,
              createdAt: item.createdAt.toISOString(),
            }))}
        />
      </div>
    </AppShell>
  );
}
