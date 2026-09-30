"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string; badge?: number; exact?: boolean };

export function NavLinks({
  links,
  label,
  vertical = false,
  onNavigate,
}: {
  links: NavLink[];
  label: string;
  vertical?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={cn("flex gap-2", vertical ? "flex-col" : "w-full items-center")}>
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
              vertical ? "w-full justify-between" : links.length > 1 ? "flex-1 justify-center text-center" : "justify-start",
              active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
            )}
          >
            {link.label}
            {link.badge ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                {link.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
