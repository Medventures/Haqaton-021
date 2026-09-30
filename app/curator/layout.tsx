import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/auth";
import { loadCuratorOverview } from "@/lib/overview";

export const dynamic = "force-dynamic";

export default async function CuratorLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("curator");
  const overview = await loadCuratorOverview(user.id);
  return (
    <AppShell user={user} badges={{ overdue: overview.counts.overdueSteps }} disclaimer={false}>
      {children}
    </AppShell>
  );
}
