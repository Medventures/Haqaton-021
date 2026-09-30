"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, type Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function LanguageSwitch() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [pending, setPending] = useState(false);

  const change = async (next: Locale) => {
    if (next === locale || pending) {
      return;
    }
    setPending(true);
    try {
      await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: next }) });
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-white p-0.5" aria-label={t.common.language}>
      <Languages className="mx-1 hidden size-3.5 text-muted-foreground sm:block" />
      {LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          disabled={pending}
          onClick={() => void change(item)}
          className={cn(
            "h-7 rounded-md px-2 text-xs font-semibold transition",
            item === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {item === "ru" ? t.common.langRu : t.common.langKk}
        </button>
      ))}
    </div>
  );
}
