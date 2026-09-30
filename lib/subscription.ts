import type { Subscription } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api";
import { getCaseForParent, saveCase } from "@/lib/cases";
import { prisma } from "@/lib/db";
import { LEGAL_VERSION } from "@/lib/legal";

export const SUBSCRIPTION_PLANS = {
  month: { priceKzt: 9900, days: 30 },
  quarter: { priceKzt: 24900, days: 90 },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { endsAt: "desc" },
  });
  if (!subscription) {
    return null;
  }
  if (subscription.endsAt < new Date()) {
    await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "expired" } });
    await detachCurator(userId);
    return null;
  }
  return subscription;
}

async function detachCurator(userId: string): Promise<void> {
  await prisma.case.updateMany({ where: { parentId: userId }, data: { curatorId: null } });
}

async function pickCurator(): Promise<string> {
  const curators = await prisma.user.findMany({
    where: { role: "curator", status: "active" },
    include: { _count: { select: { curatorCases: true } } },
  });
  if (curators.length === 0) {
    throw new ApiError(409, "noCurators");
  }
  curators.sort((a, b) => a._count.curatorCases - b._count.curatorCases || a.createdAt.getTime() - b.createdAt.getTime());
  return curators[0].id;
}

export async function purchaseSubscription(
  userId: string,
  plan: SubscriptionPlan,
  meta: { ip: string | null; userAgent: string | null },
): Promise<Subscription> {
  if (await getActiveSubscription(userId)) {
    throw new ApiError(409, "subscriptionActive");
  }
  const record = await getCaseForParent(userId);
  if (!record) {
    throw new ApiError(404, "caseNotFound");
  }
  const curatorId = await pickCurator();
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + SUBSCRIPTION_PLANS[plan].days * 86_400_000);
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      plan,
      priceKzt: SUBSCRIPTION_PLANS[plan].priceKzt,
      status: "active",
      startsAt,
      endsAt,
      paymentRef: `TEST-${randomBytes(6).toString("hex").toUpperCase()}`,
    },
  });
  await prisma.consent.create({
    data: { userId, document: "curator", version: LEGAL_VERSION, ip: meta.ip, userAgent: meta.userAgent },
  });
  await prisma.case.update({ where: { id: record.id }, data: { curatorId } });
  if (record.plan && !record.plan.approved && record.status !== "plan_draft") {
    await saveCase(record.id, { status: "plan_draft" });
  }
  return subscription;
}

export async function cancelSubscription(userId: string): Promise<void> {
  await prisma.subscription.updateMany({ where: { userId, status: "active" }, data: { status: "cancelled", endsAt: new Date() } });
  await detachCurator(userId);
}
