// lib/rate-limit.ts — Dual-mode rate limiter (Upstash Redis + in-memory fallback)
//
// PRODUCTION NOTE: In-memory rate limiting resets on every process restart/deploy
// and is NOT shared across multiple instances. For production deployments, set both:
//   UPSTASH_REDIS_REST_URL  and  UPSTASH_REDIS_REST_TOKEN
// to enable the Redis-backed limiter which is persistent and instance-independent.
// A missing or unreachable Redis will automatically fall back to in-memory (fail-open).
import { log } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per interval
  refillInterval: number; // milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // seconds
}

// =============================================================================
// In-Memory Token Bucket (development / single-instance fallback)
// =============================================================================

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let lastGC = Date.now();
const GC_INTERVAL = 60_000; // 1 minute

function cleanupBuckets() {
  const now = Date.now();
  if (now - lastGC < GC_INTERVAL) return;
  lastGC = now;

  // Evict stale buckets (not accessed in 10 minutes)
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 600_000) {
      buckets.delete(key);
    }
  }

  // If still over limit, evict oldest
  if (buckets.size > MAX_BUCKETS) {
    const entries = [...buckets.entries()].sort(
      (a, b) => a[1].lastRefill - b[1].lastRefill
    );
    const toRemove = entries.slice(0, entries.length - MAX_BUCKETS);
    for (const [key] of toRemove) {
      buckets.delete(key);
    }
  }
}

function inMemoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupBuckets();

  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const refillCount = Math.floor(elapsed / config.refillInterval) * config.refillRate;
  if (refillCount > 0) {
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + refillCount);
    bucket.lastRefill = now;
  }

  // Try to consume a token
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return { allowed: true, remaining: bucket.tokens };
  }

  // Rate limited
  const retryAfter = Math.ceil(config.refillInterval / 1000);
  return { allowed: false, remaining: 0, retryAfter };
}

// =============================================================================
// Upstash Redis Rate Limiter (production)
// =============================================================================

async function redisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return inMemoryRateLimit(key, config);
  }

  try {
    const windowMs = config.refillInterval;
    const now = Date.now();
    const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;

    // Increment counter using Upstash REST API
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", windowKey],
        ["PEXPIRE", windowKey, String(windowMs)],
      ]),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.status}`);
    }

    const results = await response.json();
    const count = results[0]?.result || 0;

    if (count <= config.maxTokens) {
      return { allowed: true, remaining: config.maxTokens - count };
    }

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((windowMs - (now % windowMs)) / 1000),
    };
  } catch (error) {
    // Fail open — allow request if Redis is down
    log("warn", "rate_limit_redis_error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return inMemoryRateLimit(key, config);
  }
}

// =============================================================================
// Public API
// =============================================================================

export function createRateLimiter(config: RateLimitConfig) {
  return async (key: string): Promise<RateLimitResult> => {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      return redisRateLimit(key, config);
    }
    return inMemoryRateLimit(key, config);
  };
}

// Pre-configured limiters
export const paymentLimiter = createRateLimiter({
  maxTokens: 5,
  refillRate: 5,
  refillInterval: 60_000, // 5/min
});

export const invoiceCreateLimiter = createRateLimiter({
  maxTokens: 30,
  refillRate: 30,
  refillInterval: 60_000, // 30/min
});

export const publicReadLimiter = createRateLimiter({
  maxTokens: 60,
  refillRate: 60,
  refillInterval: 60_000, // 60/min
});

export const privateCrudLimiter = createRateLimiter({
  maxTokens: 120,
  refillRate: 120,
  refillInterval: 60_000, // 120/min
});

export const guestInvoiceLimiter = createRateLimiter({
  maxTokens: 20,
  refillRate: 20,
  refillInterval: 86_400_000, // 20/day
});

// Email sending rate limiter (prevent abuse)
export const emailSendLimiter = createRateLimiter({
  maxTokens: 10,
  refillRate: 10,
  refillInterval: 3_600_000, // 10/hour
});

// Share link generation rate limiter
export const shareLinkLimiter = createRateLimiter({
  maxTokens: 30,
  refillRate: 30,
  refillInterval: 3_600_000, // 30/hour
});

// =============================================================================
// Client IP Extraction
// =============================================================================

export function getClientIP(request: Request): string {
  // Cloudflare provides the real client IP
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Rightmost X-Forwarded-For (proxy-appended, not user-controlled)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts[parts.length - 1] || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Helper to check rate limit and return 429 response if exceeded.
 */
export async function checkRateLimit(
  limiter: (key: string) => Promise<RateLimitResult>,
  request: Request
): Promise<Response | null> {
  const ip = getClientIP(request);
  const result = await limiter(ip);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || 60),
        },
      }
    );
  }

  return null;
}
