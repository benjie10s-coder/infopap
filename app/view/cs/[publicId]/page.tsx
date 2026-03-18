// app/view/cs/[publicId]/page.tsx — Public cash sale view page
import { getCashSaleByPublicId } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicCashSaleView } from "./PublicCashSaleView";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: { publicId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sale = await getCashSaleByPublicId(params.publicId);
  if (!sale) return { title: "Cash Sale Not Found" };

  return {
    title: `${sale.cashSaleNumber} — InvoSafi`,
    description: `View ${sale.documentTitle} ${sale.cashSaleNumber} from ${sale.fromName || "InvoSafi"}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicCashSalePage({ params }: Props) {
  const sale = await getCashSaleByPublicId(params.publicId);

  if (!sale) {
    notFound();
  }

  // Optional auth — no redirect if unauthenticated
  let user: { displayName: string; email: string; avatarUrl: string | null } | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const admin = getAdminClient();
      const { data: dbUser } = await admin
        .from("User")
        .select("name, email, avatarUrl")
        .eq("externalId", authUser.id)
        .single();
      if (dbUser) {
        user = { displayName: dbUser.name ?? "", email: dbUser.email ?? "", avatarUrl: dbUser.avatarUrl };
      }
    }
  } catch {
    // unauthenticated — public view
  }

  return <PublicCashSaleView cashSale={sale} user={user} />;
}
