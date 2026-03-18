// app/api/subscriptions/status/route.ts — GET (Poll subscription payment status)
import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionById } from "@/lib/db";
import { checkRateLimit, publicReadLimiter } from "@/lib/rate-limit";
import { getTenantContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(publicReadLimiter, request);
  if (limited) return limited;

  const tenant = await getTenantContext();
  if (!tenant.isAuthenticated || !tenant.userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subscriptionId = searchParams.get("subscriptionId");

  if (!subscriptionId) {
    return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
  }

  const subscription = await getSubscriptionById(subscriptionId);

  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  // Only allow the subscription owner to check status
  if (subscription.userId !== tenant.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return NextResponse.json({
    id: subscription.id,
    plan: subscription.plan,
    status: subscription.status,
    documentsLimit: subscription.documentsLimit,
    documentsUsed: subscription.documentsUsed,
    expiresAt: subscription.expiresAt,
    purchasedAt: subscription.purchasedAt,
  });
}
