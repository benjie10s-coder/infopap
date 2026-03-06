// lib/hooks/use-is-mobile.ts — Detect narrow viewports via matchMedia
"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768; // px

/** Returns `true` when the viewport is narrower than 768 px. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mql.matches);
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
