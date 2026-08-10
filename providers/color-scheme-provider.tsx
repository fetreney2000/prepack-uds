// Color-scheme hydration provider — client component.
// Applies cached CSS vars to :root on mount (instant first paint), then
// fetches the DB-active scheme + custom schemes to reconcile (mirrors the
// original's localStorage preload + server fetch on load).
//
// Dark-mode aware: when the resolved theme is "dark", it applies the
// design-system dark palette (Rose Pine dark) instead of the active
// scheme's light palette. All built-in schemes are light palettes.
//
// Critical: light scheme vars are applied as inline styles on :root, which
// would override the `.dark` class. So we NEVER apply a light scheme's vars
// while dark mode is active — dark mode always uses the dark palette.
"use client";

import { useEffect, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useColorSchemeStore } from "@/stores/color-scheme-store";
import { BUILT_IN_SCHEMES, findBuiltInScheme } from "@/lib/color-schemes";
import { getActiveColorScheme, listCustomColorSchemes } from "@/app/actions/settings";

export function ColorSchemeProvider({ children }: { children: ReactNode }) {
  const hydrateFromCache = useColorSchemeStore((s) => s.hydrateFromCache);
  const setActiveScheme = useColorSchemeStore((s) => s.setActiveScheme);
  const applyScheme = useColorSchemeStore((s) => s.applyScheme);
  const applyDark = useColorSchemeStore((s) => s.applyDark);
  const cssVars = useColorSchemeStore((s) => s.cssVars);
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  // Instant first paint from cache (before the server fetch resolves).
  useEffect(() => {
    hydrateFromCache();
  }, [hydrateFromCache]);

  // Reconcile active scheme from the server. When dark mode is active we
  // always use the dark palette and never clobber it with a light scheme.
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
        // Store the active scheme id/vars, but only apply its (light) vars
        // when NOT in dark mode.
        setActiveScheme(scheme.schemeId, scheme.css, isDark);
      }
    }
    reconcile();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveScheme, isDark]);

  // Apply the correct palette whenever the theme changes. Dark mode always
  // uses the dark palette; returning to light mode re-applies the active
  // scheme's vars (cached in the store) that dark had overridden.
  useEffect(() => {
    if (isDark) {
      applyDark();
    } else if (cssVars && Object.keys(cssVars).length > 0) {
      applyScheme(cssVars);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, applyDark, applyScheme]);

  return <>{children}</>;
}
