// app/auth/signup/page.tsx — Signup page (same as login since Google OAuth)
"use client";

import { useEffect, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { createBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [pendingDocInfo, setPendingDocInfo] = useState<{
    publicId: string;
    documentType: string;
  } | null>(null);

  // On mount, check if there's a pending document save from guest mode
  useEffect(() => {
    const pending = localStorage.getItem("invopap_pending_save");
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        if (parsed.publicId && parsed.documentType) {
          setPendingDocInfo(parsed);
          // Set a short-lived cookie so the server-side OAuth callback can read it
          document.cookie = `invopap_pending_doc=${encodeURIComponent(pending)}; path=/; max-age=600; SameSite=Lax`;
        }
      } catch {
        // Invalid JSON — ignore
      }
      // Clear localStorage regardless
      localStorage.removeItem("invopap_pending_save");
    }
  }, []);

  async function handleGoogleSignup() {
    const supabase = createBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
  }

  return (
    <div className="min-h-screen bg-mist/30">
      <AuthNav />

      <div className="flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-sm space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-display font-bold text-ink">
              Create your account
            </h1>
            <p className="text-sm text-ink/50 mt-2">
              {pendingDocInfo
                ? "Sign up to save your document to your account"
                : "Save invoices, track payments, and manage your business documents"}
            </p>
          </div>

          {/* Pending document save banner */}
          {pendingDocInfo && (
            <div className="p-3 bg-lagoon/5 border border-lagoon/20 rounded-xl text-center">
              <p className="text-sm text-lagoon font-medium">
                Your document will be saved to your account after signing up
              </p>
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleSignup}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-mist bg-white px-4 py-3 text-sm font-medium text-ink shadow-sm hover:shadow-md hover:border-ink/20 transition-all"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </button>

          {/* Benefits */}
          <ul className="space-y-3 text-sm text-ink/60">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-lagoon flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save and manage all your documents
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-lagoon flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Dashboard with financial overview
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-lagoon flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Access your documents from any device
            </li>
          </ul>

          {/* Back to editor */}
          <div className="text-center">
            <a href="/" className="text-sm text-lagoon hover:underline">
              ← Continue as guest
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
