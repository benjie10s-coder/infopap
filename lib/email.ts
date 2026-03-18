// lib/email.ts — Document email delivery service using Resend
import { Resend } from "resend";
import { getAdminClient } from "@/lib/supabase/admin";
import { getResendConfig, isEmailEnabled, getAppUrl } from "@/lib/env";
import { log } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type DocumentType =
  | "invoice"
  | "cash-sale"
  | "delivery-note"
  | "receipt"
  | "purchase-order"
  | "quotation";

export interface SendDocumentEmailParams {
  documentType: DocumentType;
  documentId: string;
  publicId: string;
  documentNumber: string;
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  senderEmail?: string;
  pdfBuffer: Buffer;
  userId?: string | null;
  guestSessionId?: string | null;
}

export interface SendDocumentEmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

// Document type display names for email subject/body
const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "Invoice",
  "cash-sale": "Cash Sale",
  "delivery-note": "Delivery Note",
  receipt: "Receipt",
  "purchase-order": "Purchase Order",
  quotation: "Quotation",
};

// =============================================================================
// Email Templates
// =============================================================================

function generateEmailHtml(params: {
  documentType: DocumentType;
  documentNumber: string;
  senderName: string;
  recipientName?: string;
  viewUrl: string;
}): string {
  const { documentType, documentNumber, senderName, recipientName, viewUrl } = params;
  const typeLabel = DOCUMENT_TYPE_LABELS[documentType];
  const greeting = recipientName ? `Dear ${recipientName}` : "Hello";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabel} ${documentNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1f8ea3 0%, #166f7f 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
      ${typeLabel} from ${senderName}
    </h1>
  </div>
  
  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 20px 0; font-size: 16px;">
      ${greeting},
    </p>
    
    <p style="margin: 0 0 20px 0;">
      Please find attached <strong>${typeLabel} #${documentNumber}</strong> from <strong>${senderName}</strong>.
    </p>
    
    <p style="margin: 0 0 25px 0;">
      The document is attached as a PDF file for your records.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${viewUrl}" style="display: inline-block; background: #1f8ea3; color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 500; font-size: 14px;">
        View Document Online
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="margin: 0; font-size: 13px; color: #666;">
      This email was sent via <a href="https://invosafi.com" style="color: #1f8ea3; text-decoration: none;">InvoSafi</a> — 
      Professional invoicing made simple.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p style="margin: 0;">
      &copy; ${new Date().getFullYear()} InvoSafi. All rights reserved.
    </p>
  </div>
</body>
</html>
  `.trim();
}

function generatePlainText(params: {
  documentType: DocumentType;
  documentNumber: string;
  senderName: string;
  recipientName?: string;
  viewUrl: string;
}): string {
  const { documentType, documentNumber, senderName, recipientName, viewUrl } = params;
  const typeLabel = DOCUMENT_TYPE_LABELS[documentType];
  const greeting = recipientName ? `Dear ${recipientName}` : "Hello";

  return `
${greeting},

Please find attached ${typeLabel} #${documentNumber} from ${senderName}.

The document is attached as a PDF file for your records.

View Document Online: ${viewUrl}

---
This email was sent via InvoSafi — Professional invoicing made simple.
https://invosafi.com
  `.trim();
}

// =============================================================================
// View URLs by Document Type
// =============================================================================

function getViewUrl(documentType: DocumentType, publicId: string): string {
  const baseUrl = getAppUrl();
  
  switch (documentType) {
    case "invoice":
      return `${baseUrl}/view/${publicId}`;
    case "cash-sale":
      return `${baseUrl}/view/cs/${publicId}`;
    case "delivery-note":
      return `${baseUrl}/view/dn/${publicId}`;
    case "receipt":
      return `${baseUrl}/view/receipt/${publicId}`;
    case "purchase-order":
      return `${baseUrl}/view/po/${publicId}`;
    case "quotation":
      return `${baseUrl}/view/quotation/${publicId}`;
    default:
      return `${baseUrl}/view/${publicId}`;
  }
}

// =============================================================================
// Email Logging
// =============================================================================

async function logEmailSend(params: {
  documentType: DocumentType;
  documentId: string;
  publicId: string;
  userId?: string | null;
  guestSessionId?: string | null;
  recipientEmail: string;
  recipientName?: string;
  senderEmail?: string;
  subject: string;
  status: "sent" | "delivered" | "bounced" | "failed";
  resendId?: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    const admin = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("DocumentEmailLog").insert({
      documentType: params.documentType,
      documentId: params.documentId,
      publicId: params.publicId,
      userId: params.userId || null,
      guestSessionId: params.guestSessionId || null,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName || null,
      senderEmail: params.senderEmail || null,
      subject: params.subject,
      status: params.status,
      resendId: params.resendId || null,
      errorMessage: params.errorMessage || null,
    });
  } catch (error) {
    // Log but don't fail the main operation
    log("warn", "email_log_failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      documentId: params.documentId,
    });
  }
}

// =============================================================================
// Main Email Send Function
// =============================================================================

export async function sendDocumentEmail(
  params: SendDocumentEmailParams
): Promise<SendDocumentEmailResult> {
  if (!isEmailEnabled()) {
    return {
      success: false,
      error: "Email service not configured. Set RESEND_API_KEY environment variable.",
    };
  }

  const config = getResendConfig();
  const resend = new Resend(config.apiKey);
  
  const typeLabel = DOCUMENT_TYPE_LABELS[params.documentType];
  const subject = `${typeLabel} #${params.documentNumber} from ${params.senderName}`;
  const viewUrl = getViewUrl(params.documentType, params.publicId);
  const filename = `${params.documentNumber}.pdf`;

  try {
    const { data, error } = await resend.emails.send({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: params.recipientEmail,
      subject,
      html: generateEmailHtml({
        documentType: params.documentType,
        documentNumber: params.documentNumber,
        senderName: params.senderName,
        recipientName: params.recipientName,
        viewUrl,
      }),
      text: generatePlainText({
        documentType: params.documentType,
        documentNumber: params.documentNumber,
        senderName: params.senderName,
        recipientName: params.recipientName,
        viewUrl,
      }),
      attachments: [
        {
          filename,
          content: params.pdfBuffer,
        },
      ],
    });

    if (error) {
      await logEmailSend({
        documentType: params.documentType,
        documentId: params.documentId,
        publicId: params.publicId,
        userId: params.userId,
        guestSessionId: params.guestSessionId,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        senderEmail: params.senderEmail,
        subject,
        status: "failed",
        errorMessage: error.message,
      });

      log("error", "email_send_failed", {
        documentId: params.documentId,
        recipientEmail: params.recipientEmail,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }

    await logEmailSend({
      documentType: params.documentType,
      documentId: params.documentId,
      publicId: params.publicId,
      userId: params.userId,
      guestSessionId: params.guestSessionId,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      senderEmail: params.senderEmail,
      subject,
      status: "sent",
      resendId: data?.id,
    });

    log("info", "email_sent", {
      documentType: params.documentType,
      documentId: params.documentId,
      publicId: params.publicId,
      recipientEmail: params.recipientEmail,
      resendId: data?.id,
    });

    return {
      success: true,
      resendId: data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await logEmailSend({
      documentType: params.documentType,
      documentId: params.documentId,
      publicId: params.publicId,
      userId: params.userId,
      guestSessionId: params.guestSessionId,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      senderEmail: params.senderEmail,
      subject,
      status: "failed",
      errorMessage,
    });

    log("error", "email_send_exception", {
      documentId: params.documentId,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// Rate Limit Check (emails per hour)
// =============================================================================

export async function checkEmailRateLimit(
  userId: string | null,
  guestSessionId: string | null,
  maxPerHour: number = 10
): Promise<{ allowed: boolean; remaining: number; resetAt?: Date }> {
  const admin = getAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from("DocumentEmailLog")
    .select("id", { count: "exact", head: true })
    .gte("createdAt", oneHourAgo);

  if (userId) {
    query = query.eq("userId", userId);
  } else if (guestSessionId) {
    query = query.eq("guestSessionId", guestSessionId);
  } else {
    // No identity provided - deny by default
    return { allowed: false, remaining: 0 };
  }

  const { count, error } = await query;

  if (error) {
    log("error", "email_rate_limit_check_failed", { error: error.message });
    // Fail open but log the error
    return { allowed: true, remaining: maxPerHour };
  }

  const emailsSent = count || 0;
  const remaining = Math.max(0, maxPerHour - emailsSent);
  const allowed = emailsSent < maxPerHour;

  return {
    allowed,
    remaining,
    resetAt: allowed ? undefined : new Date(Date.now() + 60 * 60 * 1000),
  };
}

// =============================================================================
// Utility: Get email send history for a document
// =============================================================================

export async function getDocumentEmailHistory(
  documentType: DocumentType,
  documentId: string
): Promise<Array<{
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  status: string;
  createdAt: string;
}>> {
  const admin = getAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("DocumentEmailLog")
    .select("id, recipientEmail, recipientName, status, createdAt")
    .eq("documentType", documentType)
    .eq("documentId", documentId)
    .order("createdAt", { ascending: false })
    .limit(20);

  if (error) {
    log("error", "email_history_fetch_failed", { 
      documentId, 
      error: error.message 
    });
    return [];
  }

  return (data as Array<{
    id: string;
    recipientEmail: string;
    recipientName: string | null;
    status: string;
    createdAt: string;
  }>) || [];
}
