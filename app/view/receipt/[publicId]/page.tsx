// app/view/receipt/[publicId]/page.tsx — Public receipt view page
import { getReceiptByPublicId } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicReceiptView } from "./PublicReceiptView";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: { publicId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const receipt = await getReceiptByPublicId(params.publicId);
  if (!receipt) return { title: "Receipt Not Found" };

  return {
    title: `${receipt.receiptNumber} — Invopap`,
    description: `View ${receipt.documentTitle} ${receipt.receiptNumber} from ${receipt.fromName || "Invopap"}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicReceiptPage({ params }: Props) {
  const receipt = await getReceiptByPublicId(params.publicId);

  if (!receipt) {
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
        user = { displayName: dbUser.name, email: dbUser.email, avatarUrl: dbUser.avatarUrl };
      }
    }
  } catch {
    // unauthenticated — public view
  }

  return <PublicReceiptView receipt={receipt} user={user} />;
}
