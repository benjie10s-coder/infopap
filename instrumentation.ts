// instrumentation.ts — Env validation on startup + graceful shutdown + M-Pesa token pre-warm
import { validateEnv } from "@/lib/env";
import { log } from "@/lib/logger";

let isShuttingDown = false;

export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}

export async function register() {
  // Validate environment variables at startup
  const { valid, errors, warnings } = validateEnv();

  for (const warning of warnings) {
    log("warn", "env_warning", { message: warning });
  }

  if (!valid) {
    for (const error of errors) {
      log("error", "env_error", { message: error });
    }
    // Don't crash in development — allow graceful degradation
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Environment validation failed:\n${errors.join("\n")}`
      );
    }
  }

  log("info", "server_start", {
    nodeEnv: process.env.NODE_ENV,
    mpesaEnabled: !!(process.env.MPESA_CONSUMER_KEY),
    redisEnabled: !!(process.env.UPSTASH_REDIS_REST_URL),
  });

  // Pre-warm M-Pesa access token so the first payment after deploy
  // doesn't eat a 300-2000ms token fetch. Runs async, non-blocking.
  if (process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET) {
    import("@/lib/mpesa").then((mpesa) => mpesa.warmUpAccessToken());
  }

  // Graceful shutdown handler (Node.js runtime only, not Edge)
  if (typeof process !== "undefined" && typeof process.on === "function") {
    process.on("SIGTERM", () => {
      isShuttingDown = true;
      log("info", "shutdown_signal", {
        message: "SIGTERM received, draining requests...",
      });
      // Give in-flight requests 10 seconds to complete
      setTimeout(() => {
        log("info", "shutdown_forced", { message: "Forcing exit" });
        process.exit(0);
      }, 10_000);
    });
  }
}
