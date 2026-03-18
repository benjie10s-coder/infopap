// lib/db/subscriptions.ts — Subscription CRUD (admin client)
import { getAdminClient } from "@/lib/supabase/admin";
import { createId } from "@paralleldrive/cuid2";
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionUsageResult,
  SubscriptionActivationResult,
} from "./types";

// =============================================================================
// Create a PENDING subscription (before M-Pesa payment)
// =============================================================================

export async function createSubscription(params: {
  userId: string;
  plan: SubscriptionPlan;
  documentsLimit: number;
  amountPaid: number;
  phoneNumber: string;
  renewedFromId?: string;
}): Promise<{ success: true; subscriptionId: string } | { success: false; error: string }> {
  const admin = getAdminClient();
  const id = createId();

  const { error } = await admin.from("Subscription").insert({
    id,
    userId: params.userId,
    plan: params.plan,
    status: "PENDING",
    documentsLimit: params.documentsLimit,
    documentsUsed: 0,
    amountPaid: params.amountPaid,
    phoneNumber: params.phoneNumber,
    renewedFromId: params.renewedFromId || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, subscriptionId: id };
}

// =============================================================================
// Update subscription with M-Pesa checkout details
// =============================================================================

export async function updateSubscriptionToProcessing(
  subscriptionId: string,
  merchantRequestId: string,
  checkoutRequestId: string
): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from("Subscription")
    .update({
      merchantRequestId,
      checkoutRequestId,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", subscriptionId);
}

// =============================================================================
// Activate subscription via RPC (called from callback)
// =============================================================================

export async function activateSubscriptionByCheckout(
  checkoutRequestId: string,
  mpesaReceiptNumber: string
): Promise<SubscriptionActivationResult | null> {
  const admin = getAdminClient();

  const { data, error } = await admin.rpc("activate_subscription", {
    p_checkout_request_id: checkoutRequestId,
    p_receipt: mpesaReceiptNumber,
  });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as unknown as SubscriptionActivationResult;
}

// =============================================================================
// Use one document from subscription via RPC
// =============================================================================

export async function consumeSubscriptionDocument(
  userId: string
): Promise<SubscriptionUsageResult | null> {
  const admin = getAdminClient();

  const { data, error } = await admin.rpc("use_subscription_document", {
    p_user_id: userId,
  });

  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as unknown as SubscriptionUsageResult;
}

// =============================================================================
// Get a user's active subscription
// =============================================================================

export async function getActiveSubscription(
  userId: string
): Promise<Subscription | null> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("Subscription")
    .select("*")
    .eq("userId", userId)
    .eq("status", "ACTIVE")
    .order("createdAt", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as Subscription;
}

// =============================================================================
// Get subscription by ID
// =============================================================================

export async function getSubscriptionById(
  subscriptionId: string
): Promise<Subscription | null> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("Subscription")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (error || !data) return null;
  return data as Subscription;
}

// =============================================================================
// Get subscription by checkoutRequestId (for callback lookup)
// =============================================================================

export async function getSubscriptionByCheckoutRequestId(
  checkoutRequestId: string
): Promise<Subscription | null> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("Subscription")
    .select("*")
    .eq("checkoutRequestId", checkoutRequestId)
    .single();

  if (error || !data) return null;
  return data as Subscription;
}

// =============================================================================
// Get all subscriptions for a user (history)
// =============================================================================

export async function getUserSubscriptions(
  userId: string
): Promise<Subscription[]> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("Subscription")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });

  if (error || !data) return [];
  return data as Subscription[];
}

// =============================================================================
// Fail a subscription payment
// =============================================================================

export async function failSubscription(
  checkoutRequestId: string
): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from("Subscription")
    .update({
      status: "CANCELLED",
      updatedAt: new Date().toISOString(),
    })
    .eq("checkoutRequestId", checkoutRequestId)
    .eq("status", "PENDING");
}
