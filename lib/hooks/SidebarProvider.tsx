// lib/hooks/SidebarProvider.tsx — Provides sidebar state to the component tree
"use client";

import { ReactNode } from "react";
import { SidebarContext, useSidebarProvider } from "@/lib/hooks/useSidebarState";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const sidebar = useSidebarProvider(false);

  return (
    <SidebarContext.Provider value={sidebar}>
      {children}
    </SidebarContext.Provider>
  );
}
