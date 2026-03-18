// app/api/admin/features/route.ts — Feature flag CRUD API
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { createRequestLogger } from "@/lib/logger";

function validateAdmin(request: NextRequest): string | null {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return null;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token !== adminSecret) return null;
  return adminSecret;
}

export async function GET(request: NextRequest) {
  const logger = createRequestLogger();

  if (!validateAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("FeatureFlag")
      .select("*")
      .order("createdAt", { ascending: true });

    if (error) throw error;

    logger.info("admin_features_listed", { count: data?.length });

    return NextResponse.json({ features: data || [] });
  } catch (error) {
    logger.error("admin_features_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to list features" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const logger = createRequestLogger();

  if (!validateAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const body = await request.json();
    const { id, enabled, scope, metadata } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing feature flag id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof enabled === "boolean") updates.enabled = enabled;
    if (scope) updates.scope = scope;
    if (metadata) updates.metadata = metadata;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("FeatureFlag")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Log to audit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("AuditLog").insert({
      actor: "admin",
      action: "feature_flag_updated",
      targetType: "feature_flag",
      targetId: id,
      details: { key: data?.key, changes: updates },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    logger.info("admin_feature_updated", { id, enabled, scope });

    return NextResponse.json({ feature: data });
  } catch (error) {
    logger.error("admin_feature_update_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const logger = createRequestLogger();

  if (!validateAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const body = await request.json();
    const { key, name, description, enabled, scope, metadata } = body;

    if (!key || !name) {
      return NextResponse.json({ error: "key and name are required" }, { status: 400 });
    }

    // Validate key format (alphanumeric + underscore)
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      return NextResponse.json(
        { error: "Key must be lowercase alphanumeric with underscores, starting with a letter" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("FeatureFlag")
      .insert({
        key,
        name,
        description: description || "",
        enabled: enabled || false,
        scope: scope || "global",
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Feature key already exists" }, { status: 409 });
      }
      throw error;
    }

    // Log to audit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("AuditLog").insert({
      actor: "admin",
      action: "feature_flag_created",
      targetType: "feature_flag",
      targetId: data?.id,
      details: { key, name },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    logger.info("admin_feature_created", { key, name });

    return NextResponse.json({ feature: data }, { status: 201 });
  } catch (error) {
    logger.error("admin_feature_create_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to create feature" }, { status: 500 });
  }
}
