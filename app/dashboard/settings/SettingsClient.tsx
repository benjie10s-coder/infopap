// app/dashboard/settings/SettingsClient.tsx — Business profile editor
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserNav } from "@/components/UserNav";
import { NarrowSidebarRail } from "@/components/LeftNavSidebar";

const CURRENCY_OPTIONS = [
  { code: "KES", label: "KES — Kenyan Shilling" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "TZS", label: "TZS — Tanzanian Shilling" },
  { code: "UGX", label: "UGX — Ugandan Shilling" },
];

interface SettingsClientProps {
  user: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface ProfileForm {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  businessCity: string;
  businessZipCode: string;
  businessNumber: string;
  defaultCurrency: string;
  defaultTaxRate: string;
}

const EMPTY_FORM: ProfileForm = {
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
  businessCity: "",
  businessZipCode: "",
  businessNumber: "",
  defaultCurrency: "KES",
  defaultTaxRate: "16",
};

export function SettingsClient({ user }: SettingsClientProps) {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setForm({
            businessName: data.businessName || "",
            businessEmail: data.businessEmail || "",
            businessPhone: data.businessPhone || "",
            businessAddress: data.businessAddress || "",
            businessCity: data.businessCity || "",
            businessZipCode: data.businessZipCode || "",
            businessNumber: data.businessNumber || "",
            defaultCurrency: data.defaultCurrency || "KES",
            defaultTaxRate: String(data.defaultTaxRate ?? 16),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const field = (
    key: keyof ProfileForm,
    label: string,
    placeholder: string,
    type = "text"
  ) => (
    <div>
      <label className="block text-sm font-medium text-ink/80 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-mist px-3 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/20 transition-colors"
      />
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const taxRate = parseFloat(form.defaultTaxRate);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName || null,
          businessEmail: form.businessEmail || null,
          businessPhone: form.businessPhone || null,
          businessAddress: form.businessAddress || null,
          businessCity: form.businessCity || null,
          businessZipCode: form.businessZipCode || null,
          businessNumber: form.businessNumber || null,
          defaultCurrency: form.defaultCurrency,
          defaultTaxRate: isNaN(taxRate) ? 16 : taxRate,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-mist bg-white/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3 pl-16">
          <Link href="/dashboard" className="text-xl font-display font-bold text-lagoon">
            InvoSafi
          </Link>
          <UserNav user={user} />
        </div>
      </header>

      <NarrowSidebarRail />

      <main className="pl-14 px-4 sm:px-8 py-8 max-w-2xl mx-auto">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-ink">
            Business Profile
          </h1>
          <p className="mt-1.5 text-sm text-ink/60">
            These details are used to prefill the &ldquo;From&rdquo; section when you create new documents. They are never shared publicly.
          </p>
        </div>

        {loadingProfile ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-mist animate-pulse" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl bg-white border border-mist p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-semibold text-ink/50 uppercase tracking-wider">
                Business Information
              </h2>

              {field("businessName", "Business / Company Name", "Acme Ltd")}
              {field("businessEmail", "Business Email", "hello@acme.co.ke", "email")}
              {field("businessPhone", "Phone Number", "+254 712 345 678", "tel")}
              {field("businessNumber", "Business / VAT Number", "P051234567X")}
            </div>

            <div className="rounded-2xl bg-white border border-mist p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-semibold text-ink/50 uppercase tracking-wider">
                Address
              </h2>

              {field("businessAddress", "Street Address", "123 Kimathi Street")}

              <div className="grid grid-cols-2 gap-4">
                {field("businessCity", "City", "Nairobi")}
                {field("businessZipCode", "Postal Code", "00100")}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-mist p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-semibold text-ink/50 uppercase tracking-wider">
                Document Defaults
              </h2>

              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1.5">
                  Default Currency
                </label>
                <select
                  value={form.defaultCurrency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultCurrency: e.target.value }))
                  }
                  className="w-full rounded-lg border border-mist px-3 py-2.5 text-sm text-ink outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/20 transition-colors bg-white"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink/80 mb-1.5">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.defaultTaxRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, defaultTaxRate: e.target.value }))
                  }
                  placeholder="16"
                  className="w-full rounded-lg border border-mist px-3 py-2.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-lagoon focus:ring-2 focus:ring-lagoon/20 transition-colors"
                />
              </div>
            </div>

            {/* Feedback messages */}
            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {saved && (
              <p className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                Business profile saved successfully.
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <Link
                href="/dashboard"
                className="text-sm text-ink/50 hover:text-ink transition-colors"
              >
                ← Back to dashboard
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-lagoon px-5 py-2.5 text-sm font-semibold text-white hover:bg-lagoon/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
