// app/view/dn/[publicId]/page.tsx — Public delivery note view page
import { getDeliveryNoteByPublicId } from "@/lib/db";
import { notFound } from "next/navigation";
import { PublicDeliveryNoteView } from "./PublicDeliveryNoteView";
import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: { publicId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dn = await getDeliveryNoteByPublicId(params.publicId);
  if (!dn) return { title: "Delivery Note Not Found" };

  return {
    title: `${dn.deliveryNoteNumber} — Invopap`,
    description: `View ${dn.documentTitle} ${dn.deliveryNoteNumber} from ${dn.fromName || "Invopap"}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicDeliveryNotePage({ params }: Props) {
  const dn = await getDeliveryNoteByPublicId(params.publicId);

  if (!dn) {
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

  return <PublicDeliveryNoteView deliveryNote={dn} user={user} />;
}
