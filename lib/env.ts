// lib/env.ts — Environment variable validation
// Called at startup via instrumentation.ts to fail fast on missing vars

export interface EnvConfig {
  // Required
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // M-Pesa (required when enabled)
  MPESA_ENVIRONMENT?: "sandbox" | "production";
  MPESA_CONSUMER_KEY?: string;
  MPESA_CONSUMER_SECRET?: string;
  MPESA_PASSKEY?: string;
  MPESA_SHORTCODE?: string;

  // Recommended
  NEXT_PUBLIC_APP_URL?: string;
  MPESA_CALLBACK_URL?: string;
  MPESA_CALLBACK_SECRET?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  ADMIN_SECRET?: string;
  SENTRY_DSN?: string;

  // Email (Resend)
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string; // e.g., "documents@yourdomain.com"
  RESEND_FROM_NAME?: string;  // e.g., "InvoSafi Documents"
}

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required variables
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // M-Pesa variables (all required if any is set)
  const mpesaVars = [
    "MPESA_ENVIRONMENT",
    "MPESA_CONSUMER_KEY",
    "MPESA_CONSUMER_SECRET",
    "MPESA_PASSKEY",
    "MPESA_SHORTCODE",
  ];
  const mpesaSet = mpesaVars.filter((k) => process.env[k]);
  if (mpesaSet.length > 0 && mpesaSet.length < mpesaVars.length) {
    const missing = mpesaVars.filter((k) => !process.env[k]);
    errors.push(
      `Partial M-Pesa config detected. Missing: ${missing.join(", ")}`
    );
  }

  if (
    process.env.MPESA_ENVIRONMENT &&
    !["sandbox", "production"].includes(process.env.MPESA_ENVIRONMENT)
  ) {
    errors.push(
      `MPESA_ENVIRONMENT must be "sandbox" or "production", got "${process.env.MPESA_ENVIRONMENT}"`
    );
  }

  // Production warnings
  if (process.env.NODE_ENV === "production") {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      warnings.push(
        "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting will use in-memory fallback (resets on every deploy, NOT suitable for multi-instance production). Set both vars to enable Redis-backed rate limiting."
      );
    }
    if (!process.env.MPESA_CALLBACK_SECRET) {
      warnings.push(
        "MPESA_CALLBACK_SECRET not set — M-Pesa callback endpoint is unprotected"
      );
    }
    if (!process.env.ADMIN_SECRET) {
      warnings.push(
        "ADMIN_SECRET not set — admin endpoints will be inaccessible"
      );
    }
    if (!process.env.SENTRY_DSN) {
      warnings.push(
        "SENTRY_DSN not set — error tracking is disabled"
      );
    }
    if (!process.env.RESEND_API_KEY) {
      warnings.push(
        "RESEND_API_KEY not set — email delivery will be disabled"
      );
    }
    if (process.env.RESEND_API_KEY && !process.env.RESEND_FROM_EMAIL) {
      warnings.push(
        "RESEND_FROM_EMAIL not set — falling back to documents@invosafi.com which must be a verified domain in your Resend account, or all emails will return 422 errors"
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Helper to get typed env values
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  return process.env[key] as EnvConfig[K];
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  );
}

export function isMpesaEnabled(): boolean {
  return !!(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_PASSKEY &&
    process.env.MPESA_SHORTCODE
  );
}

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function getResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.RESEND_FROM_EMAIL || "documents@invosafi.com",
    fromName: process.env.RESEND_FROM_NAME || "InvoSafi",
  };
}
