"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";

type Labels = { approve: string; reject: string; note: string; notePlaceholder?: string; approved: string; rejected: string };

export function DecisionForm({ endpoint, labels, compact }: { endpoint: string; labels: Labels; compact?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (decision: "approved" | "rejected") => {
    if (decision === "rejected" && !note.trim()) {
      toast.error(t.errors.noteRequired);
      return;
    }
    setBusy(decision);
    try {
      await postJson(endpoint, { decision, note: note.trim() || undefined });
      toast.success(decision === "approved" ? labels.approved : labels.rejected);
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-2">
      <Textarea
        rows={compact ? 2 : 3}
        value={note}
        placeholder={labels.notePlaceholder ?? labels.note}
        aria-label={labels.note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={busy !== null} onClick={() => void decide("approved")}>
          {busy === "approved" ? <Loader2 className="animate-spin" /> : <Check />} {labels.approve}
        </Button>
        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={busy !== null} onClick={() => void decide("rejected")}>
          {busy === "rejected" ? <Loader2 className="animate-spin" /> : <X />} {labels.reject}
        </Button>
      </div>
    </div>
  );
}
