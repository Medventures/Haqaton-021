import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { cabinetPath } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ t }, user, { next }] = await Promise.all([getI18n(), getCurrentUser(), searchParams]);
  if (user) {
    redirect(cabinetPath(user.role));
  }
  return (
    <AppShell user={null} width="narrow" disclaimer={false}>
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{t.auth.loginTitle}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{t.auth.loginSubtitle}</p>
        <LoginForm next={next} />
      </div>
    </AppShell>
  );
}
