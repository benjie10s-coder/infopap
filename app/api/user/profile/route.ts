// app/api/user/profile/route.ts — GET and PUT user business profile
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/session";
import { getUserById, updateUser } from "@/lib/db/supabase-db";
import { UserProfileSchema } from "@/lib/validators";

export async function GET() {
  const ctx = await getTenantContext();

  if (!ctx.isAuthenticated || !ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(ctx.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    businessName: user.businessName,
    businessEmail: user.businessEmail,
    businessPhone: user.businessPhone,
    businessAddress: user.businessAddress,
    businessCity: user.businessCity,
    businessZipCode: user.businessZipCode,
    businessNumber: user.businessNumber,
    logoUrl: user.logoUrl,
    defaultCurrency: user.defaultCurrency,
    defaultTaxRate: user.defaultTaxRate,
  });
}

export async function PUT(request: NextRequest) {
  const ctx = await getTenantContext();

  if (!ctx.isAuthenticated || !ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UserProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  try {
    const updated = await updateUser(ctx.userId, parsed.data);
    return NextResponse.json({
      businessName: updated.businessName,
      businessEmail: updated.businessEmail,
      businessPhone: updated.businessPhone,
      businessAddress: updated.businessAddress,
      businessCity: updated.businessCity,
      businessZipCode: updated.businessZipCode,
      businessNumber: updated.businessNumber,
      logoUrl: updated.logoUrl,
      defaultCurrency: updated.defaultCurrency,
      defaultTaxRate: updated.defaultTaxRate,
    });
  } catch (err) {
    console.error("[PUT /api/user/profile]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
