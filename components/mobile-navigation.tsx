"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NavLinks, type NavLink } from "@/components/nav-links";
import { cn } from "@/lib/utils";

export function MobileNavigation({
  links,
  label,
  closeLabel,
  container,
}: {
  links: NavLink[];
  label: string;
  closeLabel: string;
  container: string;
}) {
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const open = openedAt === pathname;
  const close = () => setOpenedAt(null);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        aria-controls="mobile-navigation"
        aria-expanded={open}
        aria-label={open ? closeLabel : label}
        onClick={() => setOpenedAt(open ? null : pathname)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
          }
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-sm font-medium hover:bg-muted lg:hidden"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
        <span className="hidden min-[360px]:inline">{open ? closeLabel : label}</span>
      </button>
      {open ? (
        <button
          type="button"
          aria-label={closeLabel}
          tabIndex={-1}
          onClick={() => {
            close();
            toggleRef.current?.focus();
          }}
          className="fixed inset-x-0 top-14 bottom-0 z-20 bg-black/10 lg:hidden"
        />
      ) : null}
      <div
        id="mobile-navigation"
        hidden={!open}
        className="absolute inset-x-0 top-full z-30 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b bg-background p-3 shadow-lg lg:hidden"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
            toggleRef.current?.focus();
          }
        }}
      >
        <div className={cn("mx-auto px-1 sm:px-3", container)}>
          <NavLinks links={links} label={label} vertical onNavigate={close} />
        </div>
      </div>
    </>
  );
}
