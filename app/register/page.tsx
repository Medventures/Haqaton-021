import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { cabinetPath } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const [{ t }, user, { role }] = await Promise.all([getI18n(), getCurrentUser(), searchParams]);
  if (user) {
    redirect(cabinetPath(user.role));
  }
  return (
    <AppShell user={null} width="narrow" disclaimer={false}>
      <div className="rounded-2xl border bg-white/60 p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold">{t.auth.registerTitle}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{t.auth.registerSubtitle}</p>
        <RegisterForm initialRole={role === "specialist" ? "specialist" : "parent"} />
      </div>
    </AppShell>
  );
}
