// lib/feature-flags.ts — Server-side feature flag checker utility
import { getAdminClient } from "@/lib/supabase/admin";

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  scope: "global" | "plan" | "user";
  metadata: Record<string, unknown>;
}

// Simple in-memory cache with 60s TTL
let cachedFlags: FeatureFlag[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

async function loadFlags(): Promise<FeatureFlag[]> {
  const now = Date.now();
  if (cachedFlags && now - cacheTimestamp < CACHE_TTL) {
    return cachedFlags;
  }

  try {
    const admin = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("FeatureFlag")
      .select("id, key, enabled, scope, metadata");

    cachedFlags = (data as FeatureFlag[]) || [];
    cacheTimestamp = now;
    return cachedFlags;
  } catch {
    return cachedFlags || [];
  }
}

/**
 * Check if a feature flag is enabled.
 * @param key - The feature flag key (e.g., "bulk_download")
 * @param userPlan - Optional user plan for plan-scoped flags (e.g., "GROWTH")
 */
export async function isFeatureEnabled(
  key: string,
  userPlan?: string
): Promise<boolean> {
  const flags = await loadFlags();
  const flag = flags.find((f) => f.key === key);

  if (!flag) return false;
  if (!flag.enabled) return false;

  // Global scope — enabled for everyone
  if (flag.scope === "global") return true;

  // Plan scope — check if user's plan is in the required plans
  if (flag.scope === "plan" && userPlan) {
    const requiredPlans = (flag.metadata?.requiredPlans as string[]) || [];
    return requiredPlans.length === 0 || requiredPlans.includes(userPlan);
  }

  // Plan-scoped but no plan provided — default to false
  if (flag.scope === "plan") return false;

  return true;
}

/**
 * Get all feature flags (for admin display).
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  return loadFlags();
}

/**
 * Invalidate the feature flag cache (call after updates).
 */
export function invalidateFeatureFlagCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}
