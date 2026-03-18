// app/dashboard/settings/page.tsx — Business profile settings (server shell)
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
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

  return (
    <SettingsClient
      user={{
        displayName: dbUser.name || user.email?.split("@")[0] || "User",
        email: dbUser.email || user.email || "",
        avatarUrl: dbUser.avatarUrl || null,
      }}
    />
  );
}
