// lib/db/quotations.ts — Quotation CRUD operations (admin client)
import { getAdminClient } from "@/lib/supabase/admin";
import { createId } from "@paralleldrive/cuid2";
import type {
  Quotation,
  QuotationWithItems,
  QuotationLineItem,
} from "./types";
import type { TenantContext } from "@/lib/session";
import { calculateQuotationTotals } from "@/lib/utils/quotation-totals";
import { processImageField } from "@/lib/storage";
import type {
  CreateQuotationInput,
  UpdateQuotationInput,
} from "@/lib/validators";

// =============================================================================
// Quotation Number Generation
// =============================================================================

function generateQuotationNumber(): string {
  const year = new Date().getFullYear();
  const suffix = createId().substring(0, 10).toUpperCase();
  return `QUO-${year}-${suffix}`;
}

// =============================================================================
// Tenant Query Helpers
// =============================================================================

function applyTenantFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  ctx: TenantContext
) {
  if (ctx.userId) {
    return query.eq("userId", ctx.userId);
  }
  if (ctx.guestSessionId) {
    return query.eq("guestSessionId", ctx.guestSessionId);
  }
  throw new Error("No tenant context");
}

// =============================================================================
// Quotation CRUD
// =============================================================================

export async function createQuotation(
  ctx: TenantContext,
  input: CreateQuotationInput
): Promise<QuotationWithItems> {
  const admin = getAdminClient();
  const quotationId = createId();
  const publicId = createId();

  // Process images
  const logoDataUrl = await processImageField(input.logoDataUrl, "logos");
  const signatureDataUrl = await processImageField(
    input.signatureDataUrl,
    "signatures"
  );

  // Calculate totals server-side (using SEPARATE quotation totals — NO TAX)
  const totals = calculateQuotationTotals({
    items: input.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
    discountType: (input.discountType as "PERCENTAGE" | "FIXED") ?? "PERCENTAGE",
    discountValue: input.discountValue ?? 0,
  });

  const quotationNumber =
    input.quotationNumber || generateQuotationNumber();

  // Build record — NO tax fields
  const quotationRecord = {
    id: quotationId,
    publicId,
    userId: ctx.userId,
    guestSessionId: ctx.guestSessionId,
    documentTitle: input.documentTitle || "QUOTATION",
    quotationNumber,
    quotationDate: input.quotationDate || new Date().toISOString(),
    validUntil: input.validUntil || null,
    fromName: input.fromName,
    fromEmail: input.fromEmail || null,
    fromPhone: input.fromPhone || null,
    fromMobile: input.fromMobile || null,
    fromFax: input.fromFax || null,
    fromAddress: input.fromAddress || null,
    fromCity: input.fromCity || null,
    fromZipCode: input.fromZipCode || null,
    fromBusinessNumber: input.fromBusinessNumber || null,
    toName: input.toName,
    toEmail: input.toEmail || null,
    toPhone: input.toPhone || null,
    toMobile: input.toMobile || null,
    toFax: input.toFax || null,
    toAddress: input.toAddress || null,
    toCity: input.toCity || null,
    toZipCode: input.toZipCode || null,
    toBusinessNumber: input.toBusinessNumber || null,
    currency: input.currency || "KES",
    discountType: input.discountType || "PERCENTAGE",
    discountValue: input.discountValue ?? 0,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    total: totals.total,
    accentColor: input.accentColor || "#f97316",
    logoDataUrl,
    signatureDataUrl,
    termsAndConditions: input.termsAndConditions || null,
    notes: input.notes || null,
  };

  // Insert quotation
  const { error: quotationError } = await admin
    .from("Quotation")
    .insert(quotationRecord);

  if (quotationError) {
    throw new Error(`Failed to create quotation: ${quotationError.message}`);
  }

  // Insert line items — with rate and amount
  const lineItems: Omit<QuotationLineItem, "createdAt" | "updatedAt">[] =
    input.items.map((item, index) => ({
      id: createId(),
      quotationId: quotationId,
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      rate: item.rate,
      amount: totals.lineAmounts[index],
      sortOrder: index,
    }));

  const { error: itemsError } = await admin
    .from("QuotationLineItem")
    .insert(lineItems);

  if (itemsError) {
    throw new Error(`Failed to create line items: ${itemsError.message}`);
  }

  // Process photo uploads
  const photos: { id: string; quotationId: string; url: string; sortOrder: number }[] = [];
  if (input.photoDataUrls) {
    for (let i = 0; i < input.photoDataUrls.length; i++) {
      const url = await processImageField(input.photoDataUrls[i], "photos");
      if (url) {
        photos.push({
          id: createId(),
          quotationId: quotationId,
          url,
          sortOrder: i,
        });
      }
    }
    if (photos.length > 0) {
      await admin.from("QuotationPhoto").insert(photos);
    }
  }

  return {
    ...(quotationRecord as unknown as Quotation),
    id: quotationId,
    publicId,
    isPaid: false,
    paidAt: null,
    pdfUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lineItems: lineItems.map((li) => ({
      ...li,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })) as QuotationLineItem[],
    photos: photos.map((p) => ({
      ...p,
      filename: null,
      createdAt: new Date().toISOString(),
    })),
  };
}

export async function getQuotationById(
  ctx: TenantContext,
  id: string
): Promise<QuotationWithItems | null> {
  const admin = getAdminClient();

  let query = admin.from("Quotation").select("*").eq("id", id);
  query = applyTenantFilter(query, ctx);

  const { data: quotation } = await query.single();
  if (!quotation) return null;

  const { data: lineItems } = await admin
    .from("QuotationLineItem")
    .select("*")
    .eq("quotationId", id)
    .order("sortOrder");

  const { data: photos } = await admin
    .from("QuotationPhoto")
    .select("*")
    .eq("quotationId", id)
    .order("sortOrder");

  return {
    ...quotation,
    lineItems: lineItems || [],
    photos: photos || [],
  };
}

export async function getQuotationByPublicId(
  publicId: string
): Promise<QuotationWithItems | null> {
  const admin = getAdminClient();

  const { data: quotation, error: quotationError } = await admin
    .from("Quotation")
    .select("*")
    .eq("publicId", publicId)
    .single();

  if (quotationError || !quotation) return null;

  const { data: lineItems } = await admin
    .from("QuotationLineItem")
    .select("*")
    .eq("quotationId", quotation.id)
    .order("sortOrder");

  // QuotationPhoto query — defensive: if table doesn't exist or query fails, default to []
  let photos: { id: string; quotationId: string; url: string; filename: string | null; sortOrder: number; createdAt: string }[] = [];
  try {
    const { data: photoData } = await admin
      .from("QuotationPhoto")
      .select("*")
      .eq("quotationId", quotation.id)
      .order("sortOrder");
    photos = (photoData || []) as typeof photos;
  } catch {
    // QuotationPhoto table may not exist yet — don't crash
  }

  return {
    ...quotation,
    lineItems: lineItems || [],
    photos,
  };
}

export async function updateQuotation(
  ctx: TenantContext,
  id: string,
  input: UpdateQuotationInput
): Promise<QuotationWithItems | null> {
  const admin = getAdminClient();

  // Verify ownership
  let ownerCheck = admin.from("Quotation").select("id").eq("id", id);
  ownerCheck = applyTenantFilter(ownerCheck, ctx);
  const { data: existing } = await ownerCheck.single();
  if (!existing) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};

  if (input.logoDataUrl !== undefined) {
    updates.logoDataUrl = await processImageField(input.logoDataUrl, "logos");
  }
  if (input.signatureDataUrl !== undefined) {
    updates.signatureDataUrl = await processImageField(
      input.signatureDataUrl,
      "signatures"
    );
  }

  // Copy scalar fields
  const scalarFields = [
    "documentTitle", "quotationNumber", "quotationDate", "validUntil",
    "fromName", "fromEmail", "fromPhone", "fromMobile",
    "fromFax", "fromAddress", "fromCity", "fromZipCode", "fromBusinessNumber",
    "toName", "toEmail", "toPhone", "toMobile", "toFax", "toAddress",
    "toCity", "toZipCode", "toBusinessNumber",
    "currency", "discountType", "discountValue",
    "accentColor", "termsAndConditions", "notes",
  ] as const;

  for (const field of scalarFields) {
    if (input[field] !== undefined) {
      updates[field] = input[field];
    }
  }

  // Replace line items if provided + recalculate totals (NO TAX)
  if (input.items) {
    const totals = calculateQuotationTotals({
      items: input.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
      discountType: ((input.discountType ?? updates.discountType) as "PERCENTAGE" | "FIXED") ?? "PERCENTAGE",
      discountValue: (input.discountValue ?? updates.discountValue) ?? 0,
    });

    updates.subtotal = totals.subtotal;
    updates.discountAmount = totals.discountAmount;
    updates.total = totals.total;

    await admin.from("QuotationLineItem").delete().eq("quotationId", id);

    const lineItems = input.items.map((item, index) => ({
      id: createId(),
      quotationId: id,
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      rate: item.rate,
      amount: totals.lineAmounts[index],
      sortOrder: index,
    }));

    await admin.from("QuotationLineItem").insert(lineItems);

    // Clear cached PDF
    updates.pdfUrl = null;
  }

  // Update quotation
  if (Object.keys(updates).length > 0) {
    await admin.from("Quotation").update(updates).eq("id", id);
  }

  return getQuotationById(ctx, id);
}

export async function deleteQuotation(
  ctx: TenantContext,
  id: string
): Promise<boolean> {
  const admin = getAdminClient();

  let query = admin.from("Quotation").delete().eq("id", id);
  query = applyTenantFilter(query, ctx);

  const { error, count } = await query;
  if (error) throw new Error(`Failed to delete quotation: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function listQuotations(
  ctx: TenantContext,
  params: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: "asc" | "desc";
    cursor?: string;
  }
): Promise<{ quotations: Quotation[]; total: number }> {
  const admin = getAdminClient();

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const orderBy = params.orderBy || "createdAt";
  const orderDir = params.orderDir || "desc";

  let query = admin
    .from("Quotation")
    .select("*", { count: "exact" })
    .order(orderBy, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1);

  query = applyTenantFilter(query, ctx);

  if (params.cursor) {
    const [cursorDate, cursorId] = params.cursor.split("_");
    if (cursorDate && cursorId) {
      query = query.or(
        `createdAt.lt.${cursorDate},and(createdAt.eq.${cursorDate},id.lt.${cursorId})`
      );
    }
  }

  const { data, count, error } = await query;

  if (error) throw new Error(`Failed to list quotations: ${error.message}`);

  return {
    quotations: data || [],
    total: count || 0,
  };
}

// =============================================================================
// Quotation Payment Helpers
// =============================================================================

export async function markQuotationPaid(
  quotationId: string,
  paidAt?: string
): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from("Quotation")
    .update({
      isPaid: true,
      paidAt: paidAt || new Date().toISOString(),
    })
    .eq("id", quotationId);
}

// Atomic claim: flip isPaid from true to false, returns true if successful
export async function consumeQuotationDownload(quotationId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("Quotation")
    .update({
      isPaid: false,
      paidAt: null,
      pdfUrl: null,
    })
    .eq("id", quotationId)
    .eq("isPaid", true) // Only update if currently paid
    .select("id")
    .single();
  return !!data;
}

export async function updateQuotationPdfUrl(
  quotationId: string,
  pdfUrl: string
): Promise<void> {
  const admin = getAdminClient();
  await admin.from("Quotation").update({ pdfUrl }).eq("id", quotationId);
}
