// lib/hooks/useBusinessProfile.ts — Fetches saved business profile for the authenticated user
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  businessNumber: string;
  logoUrl: string | null;
  currency: string;
  taxRate: number;
}

export function useBusinessProfile(): {
  profile: BusinessProfile | null;
  loading: boolean;
} {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setProfile({
            name: data.businessName || "",
            email: data.businessEmail || "",
            phone: data.businessPhone || "",
            address: data.businessAddress || "",
            city: data.businessCity || "",
            zipCode: data.businessZipCode || "",
            businessNumber: data.businessNumber || "",
            logoUrl: data.logoUrl || null,
            currency: data.defaultCurrency || "KES",
            taxRate: data.defaultTaxRate ?? 16,
          });
        }
      })
      .catch(() => {
        // silently fail — prefill is non-critical
      })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  return { profile, loading };
}
