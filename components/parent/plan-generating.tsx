"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";

export function PlanGenerating({ caseId }: { caseId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = async () => {
    setPhase("loading");
    setError(null);
    try {
      const result = await postJson<{ visibleToFamily: boolean }>(`/api/cases/${caseId}/generate`);
      setVisible(result.visibleToFamily);
      setPhase("done");
    } catch (cause) {
      setError(errorMessage(cause));
      setPhase("error");
    }
  };

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void run();
  });

  if (phase === "loading") {
    return (
      <section className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <Loader2 className="mx-auto size-10 animate-spin text-primary" />
        <h1 className="mt-4 text-xl font-semibold">{t.plan.generating}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.plan.generatingText}</p>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">{t.plan.generateFailed}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4 h-11" onClick={() => void run()}>
          <RotateCcw /> {t.plan.retry}
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-white p-8 text-center shadow-sm">
      <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
      <h1 className="mt-4 text-xl font-semibold">{visible ? t.plan.readyTitle : t.plan.readyCuratorTitle}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{visible ? t.plan.readyText : t.plan.readyCuratorText}</p>
      <Button
        className="mt-6 h-12 w-full text-base"
        onClick={() => {
          router.push("/parent");
          router.refresh();
        }}
      >
        {visible ? t.plan.openRoute : t.plan.toCabinet}
      </Button>
    </section>
  );
}
