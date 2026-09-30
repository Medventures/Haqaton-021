import Link from "next/link";
import { LogOut } from "lucide-react";
import { Disclaimer, Logo } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { MobileNavigation } from "@/components/mobile-navigation";
import { NavLinks, type NavLink } from "@/components/nav-links";
import type { CurrentUser } from "@/lib/auth";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import { cabinetPath, type Role } from "@/lib/session";
import { cn } from "@/lib/utils";

function navFor(role: Role, t: Dictionary, badges: Partial<Record<string, number>>): NavLink[] {
  switch (role) {
    case "parent":
      return [
        { href: "/parent", label: t.nav.route, exact: true },
        { href: "/specialists", label: t.nav.specialists },
        { href: "/parent/calendar", label: t.nav.calendar },
        { href: "/parent/journal", label: t.nav.journal },
        { href: "/parent/documents", label: t.nav.documents },
        { href: "/parent/subscription", label: t.nav.subscription },
      ];
    case "curator":
      return [
        { href: "/curator", label: t.nav.families, exact: true },
        { href: "/curator/overdue", label: t.nav.overdue, badge: badges.overdue },
        { href: "/curator/calendar", label: t.nav.calendar },
      ];
    case "specialist":
      return [
        { href: "/specialist", label: t.nav.myProfile, exact: true },
        { href: "/specialist/journal", label: t.nav.journal },
        { href: "/specialists", label: t.nav.specialists },
      ];
    case "commission":
      return [
        { href: "/commission", label: t.nav.applications, badge: badges.pending },
        { href: "/specialists", label: t.nav.specialists },
      ];
    case "moderator":
      return [
        { href: "/moderator", label: t.nav.reviews, badge: badges.pending },
        { href: "/specialists", label: t.nav.specialists },
      ];
    case "admin":
      return [
        { href: "/admin", label: t.nav.questions, exact: true },
        { href: "/admin/users", label: t.nav.users },
        { href: "/specialists", label: t.nav.specialists },
      ];
  }
}

export async function AppShell({
  user,
  children,
  width = "wide",
  badges = {},
  disclaimer,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
  width?: "narrow" | "wide";
  badges?: Partial<Record<string, number>>;
  disclaimer?: boolean;
}) {
  const { t } = await getI18n();
  const contentContainer = width === "narrow" ? "max-w-2xl" : "max-w-7xl";
  const headerContainer = "max-w-7xl";
  const links = user ? navFor(user.role, t, badges) : [{ href: "/specialists", label: t.nav.specialists }];
  const showDisclaimer = disclaimer ?? (!user || user.role === "parent");
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className={cn("mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:px-6", headerContainer)}>
          <Logo href={user ? cabinetPath(user.role) : "/"} />
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitch />
            {user ? (
              <>
                <div className="hidden text-right text-xs leading-tight xl:block">
                  <div className="font-medium text-foreground">{user.name}</div>
                  <div className="text-muted-foreground">{t.roles[user.role]}</div>
                </div>
                <a
                  href="/api/auth/logout"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-sm hover:bg-muted"
                  aria-label={t.common.logout}
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">{t.common.logout}</span>
                </a>
              </>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium hover:bg-muted">
                  {t.common.login}
                </Link>
                <Link
                  href="/register"
                  className="hidden h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex"
                >
                  {t.common.register}
                </Link>
              </>
            )}
            <MobileNavigation links={links} label={t.nav.menu} closeLabel={t.common.close} container={headerContainer} />
          </div>
        </div>
        <div className="hidden border-t bg-white/50 lg:block">
          <div className={cn("mx-auto px-4 py-2 sm:px-6", headerContainer)}>
            <NavLinks links={links} label={t.nav.menu} />
          </div>
        </div>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-4 py-5 sm:px-6 lg:py-8", contentContainer)}>{children}</main>
      <footer className={cn("mx-auto flex w-full flex-col gap-3 px-4 pb-6 text-xs text-muted-foreground sm:px-6", contentContainer)}>
        {showDisclaimer ? <Disclaimer t={t} /> : null}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/legal/terms" className="hover:text-foreground hover:underline">
            {t.legal.terms}
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground hover:underline">
            {t.legal.privacy}
          </Link>
          <Link href="/legal/curator" className="hover:text-foreground hover:underline">
            {t.legal.curator}
          </Link>
        </div>
      </footer>
    </div>
  );
}
