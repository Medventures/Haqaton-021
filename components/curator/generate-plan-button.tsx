"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";

export function GeneratePlanButton({ caseId }: { caseId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await postJson(`/api/cases/${caseId}/generate`);
          toast.success(t.plan.planGenerated);
          router.refresh();
        } catch (error) {
          toast.error(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {busy ? t.plan.generating : t.plan.generatePlan}
    </Button>
  );
}
