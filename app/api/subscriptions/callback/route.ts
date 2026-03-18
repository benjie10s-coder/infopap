// app/api/subscriptions/callback/route.ts — POST (Safaricom M-Pesa callback for subscriptions)
import { NextRequest, NextResponse } from "next/server";
import {
  parseSTKCallback,
  isSafaricomIP,
  type STKCallbackData,
} from "@/lib/mpesa";
import {
  getSubscriptionByCheckoutRequestId,
  activateSubscriptionByCheckout,
  failSubscription,
} from "@/lib/db";
import { getClientIP } from "@/lib/rate-limit";
import { createRequestLogger } from "@/lib/logger";

// Always return 200 to Safaricom — non-200 causes retries
const OK_RESPONSE = NextResponse.json(
  { ResultCode: 0, ResultDesc: "Accepted" },
  { status: 200 }
);

export async function POST(request: NextRequest) {
  const logger = createRequestLogger();

  try {
    // 1. Verify callback secret
    const callbackSecret = process.env.MPESA_CALLBACK_SECRET;
    if (callbackSecret) {
      const url = new URL(request.url);
      const token = url.searchParams.get("token");
      if (token !== callbackSecret) {
        logger.warn("subscription_callback_invalid_secret", {
          ip: getClientIP(request),
        });
        return OK_RESPONSE;
      }
    }

    // 2. IP whitelist
    const clientIP = getClientIP(request);
    if (!isSafaricomIP(clientIP)) {
      logger.warn("subscription_callback_invalid_ip", { ip: clientIP });
      return OK_RESPONSE;
    }

    // 3. Parse callback data
    const data: STKCallbackData = await request.json();
    const parsed = parseSTKCallback(data);

    logger.info("subscription_callback_received", {
      checkoutRequestId: parsed.checkoutRequestId,
      resultCode: parsed.resultCode,
      success: parsed.success,
    });

    // 4. Look up subscription by checkoutRequestId
    const subscription = await getSubscriptionByCheckoutRequestId(
      parsed.checkoutRequestId
    );

    if (!subscription) {
      logger.warn("subscription_callback_no_subscription", {
        checkoutRequestId: parsed.checkoutRequestId,
      });
      return OK_RESPONSE;
    }

    // 5. Idempotency: skip if already in terminal state
    if (["ACTIVE", "EXHAUSTED", "EXPIRED", "CANCELLED"].includes(subscription.status)) {
      logger.info("subscription_callback_already_terminal", {
        subscriptionId: subscription.id,
        status: subscription.status,
      });
      return OK_RESPONSE;
    }

    // 6. Handle success
    if (parsed.success) {
      // Validate amount matches plan price
      if (parsed.amount && parsed.amount < subscription.amountPaid) {
        logger.error("subscription_callback_amount_mismatch", {
          expected: subscription.amountPaid,
          received: parsed.amount,
          subscriptionId: subscription.id,
        });
        await failSubscription(parsed.checkoutRequestId);
        return OK_RESPONSE;
      }

      const result = await activateSubscriptionByCheckout(
        parsed.checkoutRequestId,
        parsed.mpesaReceiptNumber || ""
      );

      if (result) {
        logger.info("subscription_activated", {
          subscriptionId: result.sub_id,
          plan: result.sub_plan,
          documentsLimit: result.documents_limit,
          expiresAt: result.expires_at,
          receipt: parsed.mpesaReceiptNumber,
        });
      } else {
        logger.error("subscription_activation_failed", {
          checkoutRequestId: parsed.checkoutRequestId,
          subscriptionId: subscription.id,
        });
      }
    } else {
      // 7. Handle failure
      await failSubscription(parsed.checkoutRequestId);

      logger.info("subscription_payment_failed", {
        subscriptionId: subscription.id,
        resultCode: parsed.resultCode,
        resultDesc: parsed.resultDesc,
      });
    }

    return OK_RESPONSE;
  } catch (error) {
    logger.error("subscription_callback_error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return OK_RESPONSE;
  }
}
