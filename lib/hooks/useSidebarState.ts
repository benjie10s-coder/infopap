// lib/hooks/useSidebarState.ts — Global left-nav sidebar open/close state
"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarState>({
  isOpen: false,
  toggle: () => {},
  open: () => {},
  close: () => {},
});

export function useSidebarState(): SidebarState {
  return useContext(SidebarContext);
}

export { SidebarContext };

export function useSidebarProvider(defaultOpen = false): SidebarState {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Persist to localStorage
  useEffect(() => {
    const stored = localStorage.getItem("invosafi-sidebar");
    if (stored !== null) {
      setIsOpen(stored === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("invosafi-sidebar", String(isOpen));
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, toggle, open, close };
}
