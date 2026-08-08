// Color-scheme hydration provider — client component.
// Applies cached CSS vars to :root on mount (instant first paint), then
// fetches the DB-active scheme + custom schemes to reconcile (mirrors the
// original's localStorage preload + server fetch on load).
//
// Dark-mode aware: when the resolved theme is "dark", it applies the
// design-system dark palette (Bold Wikipedia dark) instead of the active
// scheme's light palette. All built-in schemes are light palettes.
"use client";

import { useEffect, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useColorSchemeStore } from "@/stores/color-scheme-store";
import { BUILT_IN_SCHEMES, findBuiltInScheme } from "@/lib/color-schemes";
import { getActiveColorScheme, listCustomColorSchemes } from "@/app/actions/settings";

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const hydrateFromCache = useColorSchemeStore((s) => s.hydrateFromCache);
  const setActiveScheme = useColorSchemeStore((s) => s.setActiveScheme);
  const applyDark = useColorSchemeStore((s) => s.applyDark);
  const { resolvedTheme } = useTheme();

  // Instant first paint from cache (before the server fetch resolves).
  useEffect(() => {
    hydrateFromCache();
  }, [hydrateFromCache]);

  // Reconcile active scheme from the server.
  useEffect(() => {
    let cancelled = false;
    async function reconcile() {
      const [activeRes, customRes] = await Promise.all([
        getActiveColorScheme(),
        listCustomColorSchemes(),
      ]);
      if (cancelled) return;
      const activeId = activeRes.ok && activeRes.data ? activeRes.data : "light";

      const map = new Map<string, { schemeId: string; css: Record<string, string> }>();
      for (const s of BUILT_IN_SCHEMES) map.set(s.schemeId, s);
      if (customRes.ok && customRes.data) {
        for (const s of customRes.data) map.set(s.schemeId, s);
      }

      const scheme = map.get(activeId) ?? findBuiltInScheme("light");
      if (scheme) {
        setActiveScheme(scheme.schemeId, scheme.css);
      }
    }
    reconcile();
    return () => {
      cancelled = true;
    };
  }, [setActiveScheme]);

  // Apply the correct palette when the resolved theme changes.
  useEffect(() => {
    if (resolvedTheme === "dark") {
      applyDark();
    }
  }, [resolvedTheme, applyDark]);

  return <>{children}</>;
}