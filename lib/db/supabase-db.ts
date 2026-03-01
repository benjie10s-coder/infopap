// lib/db/supabase-db.ts — Invoice + User CRUD (main data access layer)
import { getAdminClient } from "@/lib/supabase/admin";
import { createId } from "@paralleldrive/cuid2";
import type {
  Invoice,
  InvoiceWithItems,
  LineItem,
  User,
  DashboardStats,
  PlatformStats,
} from "./types";
import type { TenantContext } from "@/lib/session";
import { calculateInvoiceTotals } from "@/lib/utils/totals";
import { processImageField } from "@/lib/storage";
import type { CreateInvoiceInput, UpdateInvoiceInput } from "@/lib/validators";
import type { Database } from "@/lib/supabase/database.types";

type InvoiceInsert = Database["public"]["Tables"]["Invoice"]["Insert"];
type InvoiceUpdate = Database["public"]["Tables"]["Invoice"]["Update"];

// =============================================================================
// Invoice Number Generation
// =============================================================================

function generateInvoiceNumber(documentType: string): string {
  const prefix =
    documentType === "RECEIPT"
      ? "RCT"
      : documentType === "ESTIMATE"
        ? "EST"
        : documentType === "QUOTE"
          ? "QTE"
          : "INV";
  const year = new Date().getFullYear();
  const suffix = createId().substring(0, 10).toUpperCase();
  return `${prefix}-${year}-${suffix}`;
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
// User CRUD
// =============================================================================

export async function findOrCreateUser(params: {
  externalId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider?: string;
}): Promise<User> {
  const admin = getAdminClient();

  // Try to find existing user
  const { data: existing } = await admin
    .from("User")
    .select("*")
    .eq("externalId", params.externalId)
    .single();

  if (existing) {
    // Update name/avatar if changed
    if (
      params.name !== existing.name ||
      params.avatarUrl !== existing.avatarUrl
    ) {
      const { data: updated } = await admin
        .from("User")
        .update({
          name: params.name || existing.name,
          avatarUrl: params.avatarUrl || existing.avatarUrl,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      return updated || existing;
    }
    return existing;
  }

  // Create new user
  const id = createId();
  const { data: newUser, error } = await admin
    .from("User")
    .insert({
      id,
      email: params.email,
      name: params.name,
      avatarUrl: params.avatarUrl,
      externalId: params.externalId,
      provider: params.provider || "google",
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return newUser!;
}

export async function getUserById(userId: string): Promise<User | null> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("User")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

// =============================================================================
// Invoice CRUD
// =============================================================================

export async function createInvoice(
  ctx: TenantContext,
  input: CreateInvoiceInput
): Promise<InvoiceWithItems> {
  const admin = getAdminClient();
  const invoiceId = createId();
  const publicId = createId();

  // Process images
  const logoDataUrl = await processImageField(input.logoDataUrl, "logos");
  const signatureDataUrl = await processImageField(
    input.signatureDataUrl,
    "signatures"
  );

  // Calculate totals server-side
  const totals = calculateInvoiceTotals({
    items: input.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
    taxRate: input.taxRate ?? 16,
    discountType: (input.discountType as "PERCENTAGE" | "FIXED") ?? "PERCENTAGE",
    discountValue: input.discountValue ?? 0,
  });

  const invoiceNumber =
    input.invoiceNumber || generateInvoiceNumber(input.documentType || "INVOICE");

  // Build invoice record
  const invoiceRecord: InvoiceInsert = {
    id: invoiceId,
    publicId,
    userId: ctx.userId,
    guestSessionId: ctx.guestSessionId,
    documentType: input.documentType || "INVOICE",
    documentTitle: input.documentTitle || input.documentType || "Invoice",
    invoiceNumber,
    issueDate: input.issueDate || new Date().toISOString(),
    dueDate: input.dueDate || null,
    paymentTerms: input.paymentTerms || "NET_7",
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
    taxRate: input.taxRate ?? 16,
    discountType: input.discountType || "PERCENTAGE",
    discountValue: input.discountValue ?? 0,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    discountAmount: totals.discountAmount,
    total: totals.total,
    accentColor: input.accentColor || "#1f8ea3",
    logoDataUrl,
    signatureDataUrl,
    notes: input.notes || null,
  };

  // Insert invoice
  const { error: invoiceError } = await admin
    .from("Invoice")
    .insert(invoiceRecord);

  if (invoiceError) {
    throw new Error(`Failed to create invoice: ${invoiceError.message}`);
  }

  // Insert line items
  const lineItems: Omit<LineItem, "createdAt" | "updatedAt">[] =
    input.items.map((item, index) => ({
      id: createId(),
      invoiceId: invoiceId,
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      rate: item.rate,
      amount: totals.lineAmounts[index],
      sortOrder: index,
    }));

  const { error: itemsError } = await admin.from("LineItem").insert(lineItems);

  if (itemsError) {
    throw new Error(`Failed to create line items: ${itemsError.message}`);
  }

  // Process photo uploads
  const photos: { id: string; invoiceId: string; url: string; sortOrder: number }[] = [];
  if (input.photoDataUrls) {
    for (let i = 0; i < input.photoDataUrls.length; i++) {
      const url = await processImageField(input.photoDataUrls[i], "photos");
      if (url) {
        photos.push({
          id: createId(),
          invoiceId: invoiceId,
          url,
          sortOrder: i,
        });
      }
    }
    if (photos.length > 0) {
      await admin.from("InvoicePhoto").insert(photos);
    }
  }

  // Return full invoice with items
  return {
    ...(invoiceRecord as unknown as Invoice),
    id: invoiceId,
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
    })) as LineItem[],
    photos: photos.map((p) => ({
      ...p,
      filename: null,
      createdAt: new Date().toISOString(),
    })),
  };
}

export async function getInvoiceById(
  ctx: TenantContext,
  id: string
): Promise<InvoiceWithItems | null> {
  const admin = getAdminClient();

  let query = admin.from("Invoice").select("*").eq("id", id);
  query = applyTenantFilter(query, ctx);

  const { data: invoice } = await query.single();
  if (!invoice) return null;

  const { data: lineItems } = await admin
    .from("LineItem")
    .select("*")
    .eq("invoiceId", id)
    .order("sortOrder");

  const { data: photos } = await admin
    .from("InvoicePhoto")
    .select("*")
    .eq("invoiceId", id)
    .order("sortOrder");

  return {
    ...invoice,
    lineItems: lineItems || [],
    photos: photos || [],
  };
}

export async function getInvoiceByPublicId(
  publicId: string
): Promise<InvoiceWithItems | null> {
  const admin = getAdminClient();

  const { data: invoice } = await admin
    .from("Invoice")
    .select("*")
    .eq("publicId", publicId)
    .single();

  if (!invoice) return null;

  const { data: lineItems } = await admin
    .from("LineItem")
    .select("*")
    .eq("invoiceId", invoice.id)
    .order("sortOrder");

  const { data: photos } = await admin
    .from("InvoicePhoto")
    .select("*")
    .eq("invoiceId", invoice.id)
    .order("sortOrder");

  return {
    ...invoice,
    lineItems: lineItems || [],
    photos: photos || [],
  };
}

export async function updateInvoice(
  ctx: TenantContext,
  id: string,
  input: UpdateInvoiceInput
): Promise<InvoiceWithItems | null> {
  const admin = getAdminClient();

  // Verify ownership
  let ownerCheck = admin.from("Invoice").select("id").eq("id", id);
  ownerCheck = applyTenantFilter(ownerCheck, ctx);
  const { data: existing } = await ownerCheck.single();
  if (!existing) return null;

  // Process images if provided
  const updates: InvoiceUpdate = {};

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
    "documentType", "documentTitle", "invoiceNumber", "issueDate", "dueDate",
    "paymentTerms", "fromName", "fromEmail", "fromPhone", "fromMobile",
    "fromFax", "fromAddress", "fromCity", "fromZipCode", "fromBusinessNumber",
    "toName", "toEmail", "toPhone", "toMobile", "toFax", "toAddress",
    "toCity", "toZipCode", "toBusinessNumber", "currency", "taxRate",
    "discountType", "discountValue", "accentColor", "notes",
  ] as const;

  for (const field of scalarFields) {
    if (input[field] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[field] = input[field];
    }
  }

  // Recalculate totals if items or financial params change
  if (input.items) {
    const taxRate = input.taxRate ?? 16;
    const discountType = (input.discountType || "PERCENTAGE") as "PERCENTAGE" | "FIXED";
    const discountValue = input.discountValue ?? 0;

    const totals = calculateInvoiceTotals({
      items: input.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
      taxRate,
      discountType,
      discountValue,
    });

    updates.subtotal = totals.subtotal;
    updates.taxAmount = totals.taxAmount;
    updates.discountAmount = totals.discountAmount;
    updates.total = totals.total;

    // Replace line items atomically
    await admin.from("LineItem").delete().eq("invoiceId", id);

    const lineItems = input.items.map((item, index) => ({
      id: createId(),
      invoiceId: id,
      description: item.description,
      additionalDetails: item.additionalDetails || null,
      quantity: item.quantity,
      rate: item.rate,
      amount: totals.lineAmounts[index],
      sortOrder: index,
    }));

    await admin.from("LineItem").insert(lineItems);

    // Clear cached PDF (invoice changed after payment)
    updates.pdfUrl = null;
  }

  // Update invoice
  if (Object.keys(updates).length > 0) {
    await admin.from("Invoice").update(updates).eq("id", id);
  }

  return getInvoiceById(ctx, id);
}

export async function deleteInvoice(
  ctx: TenantContext,
  id: string
): Promise<boolean> {
  const admin = getAdminClient();

  let query = admin.from("Invoice").delete().eq("id", id);
  query = applyTenantFilter(query, ctx);

  const { error, count } = await query;
  if (error) throw new Error(`Failed to delete invoice: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function listInvoices(
  ctx: TenantContext,
  params: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: "asc" | "desc";
    cursor?: string;
  }
): Promise<{ invoices: Invoice[]; total: number }> {
  const admin = getAdminClient();

  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;
  const orderBy = params.orderBy || "createdAt";
  const orderDir = params.orderDir || "desc";

  let query = admin
    .from("Invoice")
    .select("*", { count: "exact" })
    .order(orderBy, { ascending: orderDir === "asc" })
    .range(offset, offset + limit - 1);

  query = applyTenantFilter(query, ctx);

  // Cursor-based pagination
  if (params.cursor) {
    const [cursorDate, cursorId] = params.cursor.split("_");
    if (cursorDate && cursorId) {
      query = query.or(
        `createdAt.lt.${cursorDate},and(createdAt.eq.${cursorDate},id.lt.${cursorId})`
      );
    }
  }

  const { data, count, error } = await query;

  if (error) throw new Error(`Failed to list invoices: ${error.message}`);

  return {
    invoices: data || [],
    total: count || 0,
  };
}

// =============================================================================
// Invoice Payment Helpers
// =============================================================================

export async function markInvoicePaid(
  invoiceId: string,
  paidAt?: string
): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from("Invoice")
    .update({
      isPaid: true,
      paidAt: paidAt || new Date().toISOString(),
    })
    .eq("id", invoiceId);
}

export async function updateInvoicePdfUrl(
  invoiceId: string,
  pdfUrl: string
): Promise<void> {
  const admin = getAdminClient();
  await admin.from("Invoice").update({ pdfUrl }).eq("id", invoiceId);
}

// =============================================================================
// Dashboard Stats
// =============================================================================

export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_dashboard_stats", {
    p_user_id: userId,
  });

  if (error) throw new Error(`Failed to get dashboard stats: ${error.message}`);
  return data as unknown as DashboardStats;
}

// =============================================================================
// Platform Stats (Admin)
// =============================================================================

export async function getPlatformStats(): Promise<PlatformStats> {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc("get_platform_stats", {
    p_admin_secret: process.env.ADMIN_SECRET || "",
  });

  if (error) throw new Error(`Failed to get platform stats: ${error.message}`);
  return data as unknown as PlatformStats;
}
