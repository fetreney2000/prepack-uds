// UI-only Zustand store: active color scheme + cached CSS vars.
// NOT server data — this mirrors what the original cached in
// localStorage (prepack-color-vars / prepack-color-scheme).
"use client";

import { create } from "zustand";

export const COLOR_VARS_KEY = "prepack-color-vars";
export const COLOR_SCHEME_KEY = "prepack-color-scheme";
export const FALLBACK_SCHEME_ID = "light";

export interface ColorSchemeDefinition {
  schemeId: string;
  name: string;
  colors: string[]; // 5 hex colors
  css: Record<string, string>; // CSS variable → value
}

interface ColorSchemeState {
  activeSchemeId: string;
  cssVars: Record<string, string>;
  hydrating: boolean;
  setActiveScheme: (id: string, vars: Record<string, string>) => void;
  applyScheme: (vars: Record<string, string>) => void;
  hydrateFromCache: () => void;
  clearCache: () => void;
}

function readCache() {
  if (typeof window === "undefined") {
    return { schemeId: FALLBACK_SCHEME_ID, vars: {} as Record<string, string> };
  }
  const schemeId = localStorage.getItem(COLOR_SCHEME_KEY) || FALLBACK_SCHEME_ID;
  let vars: Record<string, string> = {};
  try {
    vars = JSON.parse(localStorage.getItem(COLOR_VARS_KEY) || "{}");
  } catch {
    vars = {};
  }
  return { schemeId, vars };
}

function applyToRoot(vars: Record<string, string>) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}

export const useColorSchemeStore = create<ColorSchemeState>((set) => ({
  activeSchemeId: FALLBACK_SCHEME_ID,
  cssVars: {},
  hydrating: true,

  setActiveScheme: (id, vars) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(COLOR_SCHEME_KEY, id);
      localStorage.setItem(COLOR_VARS_KEY, JSON.stringify(vars));
    }
    applyToRoot(vars);
    set({ activeSchemeId: id, cssVars: vars });
  },

  applyScheme: (vars) => {
    applyToRoot(vars);
    set({ cssVars: vars });
  },

  hydrateFromCache: () => {
    const { schemeId, vars } = readCache();
    applyToRoot(vars);
    set({ activeSchemeId: schemeId, cssVars: vars, hydrating: false });
  },

  clearCache: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(COLOR_SCHEME_KEY);
      localStorage.removeItem(COLOR_VARS_KEY);
    }
    set({ activeSchemeId: FALLBACK_SCHEME_ID, cssVars: {} });
  },
}));