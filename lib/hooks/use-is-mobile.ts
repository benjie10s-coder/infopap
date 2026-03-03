// lib/hooks/use-is-mobile.ts — Detect mobile/tablet devices via viewport + touch
// Uses matchMedia + touch-point detection (more reliable than UA sniffing).
"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768; // px

/** Returns `true` on mobile/tablet devices (narrow viewport OR touch-capable). */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check touch capability (covers tablets with wide viewports)
    const hasTouch =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    function update() {
      setIsMobile(mql.matches || hasTouch);
    }

    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
