// app/api/subscriptions/active/route.ts — GET (Get user's active subscription)
import { NextRequest, NextResponse } from "next/server";
import { getActiveSubscription } from "@/lib/db";
import { checkRateLimit, publicReadLimiter } from "@/lib/rate-limit";
import { getTenantContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(publicReadLimiter, request);
  if (limited) return limited;

  const tenant = await getTenantContext();
  if (!tenant.isAuthenticated || !tenant.userId) {
    return NextResponse.json({ subscription: null });
  }

  const subscription = await getActiveSubscription(tenant.userId);

  if (!subscription) {
    return NextResponse.json({ subscription: null });
  }

  return NextResponse.json({
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      documentsLimit: subscription.documentsLimit,
      documentsUsed: subscription.documentsUsed,
      documentsRemaining: subscription.documentsLimit - subscription.documentsUsed,
      expiresAt: subscription.expiresAt,
      purchasedAt: subscription.purchasedAt,
    },
  });
}
