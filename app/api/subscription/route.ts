import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, clientMeta, handleApiError, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { cancelSubscription, purchaseSubscription } from "@/lib/subscription";

const bodySchema = z.object({
  plan: z.enum(["month", "quarter"]),
  acceptCurator: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(["parent"]);
    const body = bodySchema.parse(await readJson(request));
    if (!body.acceptCurator) {
      throw new ApiError(400, "consentRequired");
    }
    const subscription = await purchaseSubscription(user.id, body.plan, clientMeta(request));
    return NextResponse.json({ ok: true, subscription: { id: subscription.id, endsAt: subscription.endsAt.toISOString() } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireApiUser(["parent"]);
    await cancelSubscription(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
