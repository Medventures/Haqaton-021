import { SubscriptionPanel } from "@/components/parent/subscription-panel";
import { requirePageUser } from "@/lib/auth";
import { getCaseForParent } from "@/lib/cases";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { SUBSCRIPTION_PLANS, getActiveSubscription } from "@/lib/subscription";

export default async function SubscriptionPage() {
  const user = await requirePageUser("parent");
  const { t } = await getI18n();
  const active = await getActiveSubscription(user.id);
  const [record, history] = await Promise.all([
    getCaseForParent(user.id),
    prisma.subscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const asPlan = (value: string) => (value === "quarter" ? "quarter" : "month") as "month" | "quarter";
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t.subscription.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subscription.subtitle}</p>
      </div>
      <SubscriptionPanel
        prices={{ month: SUBSCRIPTION_PLANS.month.priceKzt, quarter: SUBSCRIPTION_PLANS.quarter.priceKzt }}
        active={active ? { plan: asPlan(active.plan), endsAt: active.endsAt.toISOString(), curatorName: record?.curatorName ?? null } : null}
        history={history.map((item) => ({
          id: item.id,
          plan: asPlan(item.plan),
          priceKzt: item.priceKzt,
          status: item.status,
          createdAt: item.createdAt.toISOString(),
          paymentRef: item.paymentRef,
        }))}
      />
    </div>
  );
}
