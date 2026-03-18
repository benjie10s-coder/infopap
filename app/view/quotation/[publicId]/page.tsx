// app/view/quotation/[publicId]/page.tsx — Public quotation view page
import { getQuotationByPublicId } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicQuotationView } from "./PublicQuotationView";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: { publicId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quotation = await getQuotationByPublicId(params.publicId);
  if (!quotation) return { title: "Quotation Not Found" };

  return {
    title: `${quotation.quotationNumber} — InvoSafi`,
    description: `View ${quotation.documentTitle} ${quotation.quotationNumber} from ${quotation.fromName || "InvoSafi"}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuotationPage({ params }: Props) {
  const quotation = await getQuotationByPublicId(params.publicId);

  if (!quotation) {
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

  return <PublicQuotationView quotation={quotation} user={user} />;
}
