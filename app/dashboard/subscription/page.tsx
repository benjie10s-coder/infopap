// app/dashboard/subscription/page.tsx — Subscription management (server component)
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { SubscriptionClient } from "./SubscriptionClient";
import type { Subscription } from "@/lib/db/types";

export default async function SubscriptionPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = getAdminClient();
  const { data: dbUser } = await admin
    .from("User")
    .select("id, name, email, avatarUrl")
    .eq("externalId", user.id)
    .single();

  if (!dbUser) {
    redirect("/auth/login");
  }

  // Fetch active subscription and history
  const [activeResult, historyResult] = await Promise.all([
    admin
      .from("Subscription")
      .select("*")
      .eq("userId", dbUser.id)
      .eq("status", "ACTIVE")
      .order("createdAt", { ascending: false })
      .limit(1),
    admin
      .from("Subscription")
      .select("*")
      .eq("userId", dbUser.id)
      .in("status", ["ACTIVE", "EXHAUSTED", "EXPIRED"])
      .order("createdAt", { ascending: false })
      .limit(10),
  ]);

  const activeSubscription = (activeResult.data?.[0] as Subscription) || null;
  const subscriptionHistory = (historyResult.data as Subscription[]) || [];

  return (
    <SubscriptionClient
      user={{
        displayName: dbUser.name || dbUser.email,
        email: dbUser.email,
        avatarUrl: dbUser.avatarUrl,
      }}
      activeSubscription={activeSubscription}
      subscriptionHistory={subscriptionHistory}
    />
  );
}
