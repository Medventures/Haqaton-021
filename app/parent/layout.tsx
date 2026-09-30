import { AppShell } from "@/components/app-shell";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("parent");
  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  );
}
