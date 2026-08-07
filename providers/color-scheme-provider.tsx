// Color-scheme hydration provider — client component.
// Applies cached CSS vars on mount (mirrors the original's
// localStorage preload in index.pug).
"use client";

import { useEffect, type ReactNode } from "react";
import { useColorSchemeStore } from "@/stores/color-scheme-store";

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const hydrateFromCache = useColorSchemeStore((s) => s.hydrateFromCache);

  useEffect(() => {
    hydrateFromCache();
  }, [hydrateFromCache]);

  return <>{children}</>;
}