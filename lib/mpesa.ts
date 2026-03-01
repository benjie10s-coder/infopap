// lib/mpesa.ts — Safaricom Daraja API client (Lipa Na M-Pesa STK Push)
import { log } from "@/lib/logger";
import { getAppUrl } from "@/lib/env";

// =============================================================================
// Types
// =============================================================================

interface AccessTokenResponse {
  access_token: string;
  expires_in: string;
}

export interface STKPushRequest {
  phoneNumber: string; // Already normalized: 254XXXXXXXXX
  amount: number;
  accountReference: string; // Max 12 chars
  transactionDesc: string; // Max 13 chars
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface STKQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

export interface STKCallbackData {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}

export interface ParsedCallback {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  success: boolean;
  amount?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

// =============================================================================
// Configuration
// =============================================================================

function getBaseUrl(): string {
  const env = process.env.MPESA_ENVIRONMENT || "sandbox";
  return env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function getCallbackUrl(): string {
  const callback = process.env.MPESA_CALLBACK_URL;
  if (callback) return callback;

  const appUrl = getAppUrl();
  const secret = process.env.MPESA_CALLBACK_SECRET;
  const tokenQuery = secret ? `?token=${secret}` : "";
  return `${appUrl}/api/payments/callback${tokenQuery}`;
}

/**
 * Generate a Daraja-compatible timestamp (YYYYMMDDHHmmss) in Africa/Nairobi timezone.
 * Safaricom requires the timestamp to be in EAT (UTC+3) — using the server's
 * local time (UTC on Railway) produces a wrong password and causes 500 errors.
 */
function getNairobiTimestamp(): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

// =============================================================================
// Access Token (cached)
// =============================================================================

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("M-Pesa credentials not configured");
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const url = `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

  let lastError: Error | null = null;

  // 2 retries with exponential backoff (6s timeout — OAuth is lightweight)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(6_000),
      });

      if (!response.ok) {
        throw new Error(`Token fetch failed: ${response.status} ${response.statusText}`);
      }

      const data: AccessTokenResponse = await response.json();
      const expiresIn = parseInt(data.expires_in, 10) * 1000; // Convert to ms

      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + expiresIn,
      };

      log("info", "mpesa_token_cached", {
        expiresInSec: Math.floor(expiresIn / 1000),
        attempt,
      });

      return data.access_token;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    }
  }

  throw lastError || new Error("Failed to get M-Pesa access token");
}

/**
 * Pre-warm the access token cache. Called at server startup to avoid
 * the first payment request eating a 300-2000ms token fetch.
 * Fails silently — if credentials aren't configured, no harm done.
 */
export async function warmUpAccessToken(): Promise<void> {
  try {
    await getAccessToken();
    log("info", "mpesa_token_prewarmed", { cached: !!cachedToken });
  } catch {
    // Non-fatal — token will be fetched on first payment request
    log("warn", "mpesa_token_prewarm_failed", {
      message: "Will fetch on first payment request",
    });
  }
}

// =============================================================================
// Phone Number Normalization
// =============================================================================

/**
 * Normalize Kenyan phone number to 254XXXXXXXXX format.
 * Handles: 07XX, 01XX, +254XX, 254XX, 7XX, 1XX
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove spaces, dashes, and other non-digit chars (except leading +)
  let cleaned = phone.replace(/[\s\-()]/g, "");

  // Remove leading +
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Handle various formats
  if (cleaned.startsWith("254") && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "254" + cleaned.substring(1);
  }
  if ((cleaned.startsWith("7") || cleaned.startsWith("1")) && cleaned.length === 9) {
    return "254" + cleaned;
  }

  throw new Error(`Invalid phone number format: ${phone}`);
}

// =============================================================================
// STK Push
// =============================================================================

/**
 * Initiate an M-Pesa STK Push (Lipa Na M-Pesa Online).
 */
export async function initiateSTKPush(
  request: STKPushRequest
): Promise<STKPushResponse> {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;

  // Generate timestamp in Africa/Nairobi timezone (required by Safaricom Daraja API)
  const timestamp = getNairobiTimestamp();

  // Generate password: Base64(Shortcode + Passkey + Timestamp)
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const callbackUrl = getCallbackUrl();

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(request.amount), // M-Pesa only accepts whole numbers
    PartyA: request.phoneNumber,
    PartyB: shortcode,
    PhoneNumber: request.phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: request.accountReference.substring(0, 12),
    TransactionDesc: request.transactionDesc.substring(0, 13),
  };

  log("info", "mpesa_stk_push_initiate", {
    phone: request.phoneNumber.substring(0, 6) + "XXXX",
    amount: request.amount,
    accountRef: body.AccountReference,
    callbackUrl,
  });

  // Retry once on timeout/network errors
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(
        `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(12_000),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        log("error", "mpesa_stk_push_failed", {
          status: response.status,
          body: text,
          attempt,
        });
        throw new Error(`STK Push failed: ${response.status} ${text}`);
      }

      const data: STKPushResponse = await response.json();

      if (data.ResponseCode !== "0") {
        log("error", "mpesa_stk_push_rejected", { data });
        throw new Error(`STK Push rejected: ${data.ResponseDescription}`);
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      const isRetryable =
        lastError.name === "TimeoutError" ||
        lastError.name === "AbortError" ||
        lastError.message.includes("fetch failed") ||
        lastError.message.includes("ECONNREFUSED") ||
        lastError.message.includes("ETIMEDOUT");

      if (isRetryable && attempt < 1) {
        log("warn", "mpesa_stk_push_retry", {
          attempt,
          error: lastError.message,
        });
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("STK Push failed after retries");
}

// =============================================================================
// STK Query (fallback)
// =============================================================================

/**
 * Query the status of an STK Push transaction.
 */
export async function querySTKPush(
  checkoutRequestId: string
): Promise<STKQueryResponse> {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;

  // Generate timestamp in Africa/Nairobi timezone (required by Safaricom Daraja API)
  const timestamp = getNairobiTimestamp();

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const response = await fetch(
    `${getBaseUrl()}/mpesa/stkpushquery/v1/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
      signal: AbortSignal.timeout(12_000),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`STK Query failed: ${response.status} ${text}`);
  }

  return response.json();
}

// =============================================================================
// Callback Parser
// =============================================================================

/**
 * Parse the STK Push callback data from Safaricom.
 */
export function parseSTKCallback(data: STKCallbackData): ParsedCallback {
  const cb = data.Body.stkCallback;
  const result: ParsedCallback = {
    merchantRequestId: cb.MerchantRequestID,
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
    success: cb.ResultCode === 0,
  };

  if (cb.CallbackMetadata?.Item) {
    for (const item of cb.CallbackMetadata.Item) {
      switch (item.Name) {
        case "Amount":
          result.amount = Number(item.Value);
          break;
        case "MpesaReceiptNumber":
          result.mpesaReceiptNumber = String(item.Value);
          break;
        case "TransactionDate":
          result.transactionDate = String(item.Value);
          break;
        case "PhoneNumber":
          result.phoneNumber = String(item.Value);
          break;
      }
    }
  }

  return result;
}

// =============================================================================
// Safaricom IP Whitelist (production callback security)
// =============================================================================

const SAFARICOM_IPS = [
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "196.201.214.207",
  "196.201.214.208",
  "196.201.213.44",
  "196.201.212.127",
  "196.201.212.128",
  "196.201.212.129",
  "196.201.212.132",
  "196.201.212.136",
  "196.201.212.138",
];

export function isSafaricomIP(ip: string): boolean {
  if (process.env.MPESA_ENVIRONMENT !== "production") return true;
  return SAFARICOM_IPS.includes(ip);
}
