// lib/hooks/usePrefillPreference.ts — Persists the user's prefill choice in localStorage
"use client";

import { useState, useEffect } from "react";

export type PrefillPreference = "ask" | "always" | "never";

const STORAGE_KEY = "infopap-prefill-preference";

export function usePrefillPreference(): {
  preference: PrefillPreference;
  setPreference: (p: PrefillPreference) => void;
} {
  const [preference, setPreferenceState] = useState<PrefillPreference>("ask");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "always" || stored === "never" || stored === "ask") {
        setPreferenceState(stored);
      }
    } catch {
      // localStorage unavailable (SSR / private mode)
    }
  }, []);

  const setPreference = (p: PrefillPreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // ignore
    }
  };

  return { preference, setPreference };
}
