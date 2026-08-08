// Color-scheme hydration provider — client component.
// Applies cached CSS vars on mount (instant first paint), then fetches
// the DB-active scheme + custom schemes to reconcile (mirrors the
// original's localStorage preload + server fetch on load).
"use client";

import { useEffect, type ReactNode } from "react";
import { useColorSchemeStore } from "@/stores/color-scheme-store";
import { BUILT_IN_SCHEMES, findBuiltInScheme } from "@/lib/color-schemes";
import { getActiveColorScheme, listCustomColorSchemes } from "@/app/actions/settings";

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const hydrateFromCache = useColorSchemeStore((s) => s.hydrateFromCache);
  const setActiveScheme = useColorSchemeStore((s) => s.setActiveScheme);

  useEffect(() => {
    // 1. Instant first paint from cache.
    hydrateFromCache();
  }, [hydrateFromCache]);

  useEffect(() => {
    let cancelled = false;
    async function reconcile() {
      const [activeRes, customRes] = await Promise.all([
        getActiveColorScheme(),
        listCustomColorSchemes(),
      ]);
      if (cancelled) return;
      const activeId = activeRes.ok && activeRes.data ? activeRes.data : "earthy";

      // Build the full scheme map: built-ins + custom (custom override).
      const map = new Map<string, { schemeId: string; css: Record<string, string> }>();
      for (const s of BUILT_IN_SCHEMES) map.set(s.schemeId, s);
      if (customRes.ok && customRes.data) {
        for (const s of customRes.data) map.set(s.schemeId, s);
      }

      const scheme = map.get(activeId) ?? findBuiltInScheme("earthy");
      if (scheme) {
        setActiveScheme(scheme.schemeId, scheme.css);
      }
    }
    reconcile();
    return () => {
      cancelled = true;
    };
  }, [setActiveScheme]);

  return <>{children}</>;
}