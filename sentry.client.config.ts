// sentry.client.config.ts — Sentry browser SDK initialization
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session replay (optional, disable for cost)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // Only report errors from our domain
  allowUrls: [/invosafi\.com/, /localhost/],

  // Filter out noisy errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    "Load failed",
    "Failed to fetch",
  ],
});
