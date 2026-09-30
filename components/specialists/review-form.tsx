"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function ReviewForm({ specialistId, initial }: { specialistId: string; initial: { rating: number; text: string } | null }) {
  const router = useRouter();
  const { t } = useI18n();
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [text, setText] = useState(initial?.text ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          await postJson(`/api/specialists/${specialistId}/reviews`, { rating, text: text.trim() });
          toast.success(t.specialists.reviewSent);
          router.refresh();
        } catch (error) {
          toast.error(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label>{t.specialists.rating}</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value}`} className="p-0.5">
              <Star className={cn("size-7", value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-text">{t.specialists.reviewText}</Label>
        <Textarea
          id="review-text"
          rows={4}
          minLength={10}
          maxLength={1500}
          value={text}
          placeholder={t.specialists.reviewPlaceholder}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t.specialists.reviewRules}</p>
      <Button type="submit" disabled={busy || text.trim().length < 10}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {t.common.send}
      </Button>
    </form>
  );
}
