// app/api/subscriptions/initiate/route.ts — POST (STK Push for subscription purchase)
import { NextRequest, NextResponse } from "next/server";
import { createSubscription, updateSubscriptionToProcessing } from "@/lib/db";
import { initiateSTKPush, normalizePhoneNumber } from "@/lib/mpesa";
import { isMpesaEnabled, getAppUrl } from "@/lib/env";
import { checkRateLimit, paymentLimiter } from "@/lib/rate-limit";
import { getTenantContext } from "@/lib/session";
import { getPlanByType } from "@/lib/plans";
import { createRequestLogger } from "@/lib/logger";
import { z } from "zod";

export const maxDuration = 60;

const SUBSCRIPTION_PLANS = ["BASIC", "GROWTH", "SCALE"] as const;

const InitiateSubscriptionSchema = z.object({
  plan: z.enum(SUBSCRIPTION_PLANS),
  phoneNumber: z
    .string()
    .min(9, "Phone number too short")
    .max(15, "Phone number too long"),
});

function getSubscriptionCallbackUrl(): string {
  const appUrl = getAppUrl();
  const secret = process.env.MPESA_CALLBACK_SECRET;
  const tokenQuery = secret ? `?token=${secret}` : "";
  return `${appUrl}/api/subscriptions/callback${tokenQuery}`;
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger();

  // Rate limit: 5/min per IP
  const limited = await checkRateLimit(paymentLimiter, request);
  if (limited) return limited;

  try {
    // Must be authenticated — no guest subscriptions
    const tenant = await getTenantContext();
    if (!tenant.isAuthenticated || !tenant.userId) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to purchase a subscription." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan, phoneNumber } = InitiateSubscriptionSchema.parse(body);

    if (!isMpesaEnabled()) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    // Get plan config
    const planConfig = getPlanByType(plan);
    if (!planConfig) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    logger.info("subscription_initiate", {
      userId: tenant.userId,
      plan,
      amount: planConfig.price,
    });

    // Create PENDING subscription
    const result = await createSubscription({
      userId: tenant.userId,
      plan: planConfig.type,
      documentsLimit: planConfig.documentsLimit,
      amountPaid: planConfig.price,
      phoneNumber: normalizedPhone,
    });

    if (!result.success) {
      logger.error("subscription_create_failed", { error: result.error });
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    // Initiate STK Push with subscription-specific callback URL
    const stkResponse = await initiateSTKPush({
      phoneNumber: normalizedPhone,
      amount: planConfig.price,
      accountReference: `SUB-${plan.substring(0, 7)}`,
      transactionDesc: "Invopap Plan",
      callbackUrl: getSubscriptionCallbackUrl(),
    });

    // Store checkout request ID for callback matching
    await updateSubscriptionToProcessing(
      result.subscriptionId,
      stkResponse.MerchantRequestID,
      stkResponse.CheckoutRequestID
    );

    logger.done("subscription_initiated", {
      subscriptionId: result.subscriptionId,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      plan,
      amount: planConfig.price,
    });

    return NextResponse.json({
      subscriptionId: result.subscriptionId,
      checkoutRequestId: stkResponse.CheckoutRequestID,
      customerMessage: stkResponse.CustomerMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("subscription_initiate_error", { error: errMsg });

    if (errMsg.includes("Invalid phone number")) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use 07XX, 01XX, or 254XX format." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initiate subscription payment" },
      { status: 500 }
    );
  }
}
