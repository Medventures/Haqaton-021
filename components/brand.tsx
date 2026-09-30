import Link from "next/link";
import { Route, ShieldCheck } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Route className="size-4" />
      </span>
      <span className="hidden sm:inline">
        AqylRoute <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}

export function Disclaimer({ t }: { t: Dictionary }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed bg-white/70 px-3 py-2 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{t.common.disclaimer}</span>
    </div>
  );
}
