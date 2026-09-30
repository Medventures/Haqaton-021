"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { errorMessage, postJson } from "@/lib/client-api";
import { formatDate, formatDateTime, toDateOnly } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Plan = "month" | "quarter";

type Props = {
  prices: Record<Plan, number>;
  active: { plan: Plan; endsAt: string; curatorName: string | null } | null;
  history: { id: string; plan: Plan; priceKzt: number; status: string; createdAt: string; paymentRef: string }[];
};

function price(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}

export function SubscriptionPanel({ prices, active, history }: Props) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [plan, setPlan] = useState<Plan>("month");
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    setBusy(true);
    try {
      await postJson("/api/subscription", { plan, acceptCurator: accept });
      toast.success(t.subscription.purchased);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/subscription", { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error);
      }
      toast.success(t.subscription.cancelled);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {active ? (
        <section className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 text-emerald-800">
            <BadgeCheck className="size-6" />
            <h2 className="text-lg font-semibold">{t.subscription.activeTitle}</h2>
          </div>
          <p className="mt-2 text-sm">
            {t.subscription.plans[active.plan].name} · {t.subscription.activeUntil(formatDate(toDateOnly(new Date(active.endsAt)), locale))}
          </p>
          {active.curatorName ? <p className="mt-1 text-sm font-medium">{t.subscription.curator(active.curatorName)}</p> : null}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="mt-4 bg-white" disabled={busy}>
                {t.subscription.cancel}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.subscription.cancelTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.subscription.cancelText}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void cancel()}>{t.subscription.cancel}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["month", "quarter"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPlan(item)}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  plan === item ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50",
                )}
              >
                <div className="text-sm text-muted-foreground">{t.subscription.plans[item].name}</div>
                <div className="mt-1 text-2xl font-semibold">{price(prices[item])}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.subscription.plans[item].text}</div>
              </button>
            ))}
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {t.subscription.includes.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-2.5 rounded-xl border bg-muted/30 p-3">
            <Checkbox id="accept-curator" checked={accept} onCheckedChange={(value) => setAccept(value === true)} className="mt-0.5" />
            <Label htmlFor="accept-curator" className="text-sm leading-snug font-normal">
              <span>
                {t.subscription.acceptPrefix}{" "}
                <Link href="/legal/curator" target="_blank" className="text-primary underline">
                  {t.subscription.curatorAgreement}
                </Link>{" "}
                {t.subscription.acceptSuffix}
              </span>
            </Label>
          </div>
          <Button className="h-12 text-base" disabled={busy || !accept} onClick={() => void buy()}>
            {busy ? <Loader2 className="animate-spin" /> : <CreditCard />} {t.subscription.pay(price(prices[plan]))}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t.subscription.testPayment}</p>
        </section>
      )}

      {history.length > 0 ? (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">{t.subscription.history}</h2>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {t.subscription.plans[item.plan].name} · {price(item.priceKzt)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)} · {item.paymentRef}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
