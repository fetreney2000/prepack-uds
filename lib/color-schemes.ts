// Color scheme definitions — 16 built-ins + CSS derivation (§4.9)
// Matches the original's hardcoded schemes in app.js exactly.
import type { ColorSchemeDefinition } from "@/stores/color-scheme-store";

const darkForeground = "#f5f5f5";

/**
 * Derive the 20 CSS variables from a scheme's 5 colors (§4.9):
 *   colors[0] background, colors[1] surface-alt, colors[2] accent,
 *   colors[3] primary, colors[4] text-primary/highlight.
 */
export function deriveCssVars(colors: string[]): Record<string, string> {
  const [bg, surface, accent, primary, highlight] = [
    colors[0] ?? "#ffffff",
    colors[1] ?? "#eeeeee",
    colors[2] ?? "#cccccc",
    colors[3] ?? "#333333",
    colors[4] ?? "#111111",
  ];
  return {
    "--background": bg,
    "--foreground": darkForeground,
    "--primary": primary,
    "--primary-foreground": "#ffffff",
    "--accent": accent,
    "--accent-foreground": darkForeground,
    "--surface-alt": surface,
    "--text-primary": highlight,
    "--text-secondary": highlight,
    "--border": accent,
    "--ring": primary,
    "--card": "#ffffff",
    "--card-foreground": darkForeground,
    "--popover": "#ffffff",
    "--popover-foreground": darkForeground,
    "--secondary": surface,
    "--secondary-foreground": darkForeground,
    "--muted": surface,
    "--muted-foreground": highlight,
    "--destructive": "#d33",
    "--destructive-foreground": "#ffffff",
    "--input": accent,
    "--radius": "0.5rem",
  };
}

/** Build a built-in scheme definition from id, name, and 5 colors. */
function builtIn(schemeId: string, name: string, colors: string[]): ColorSchemeDefinition {
  return { schemeId, name, colors, css: deriveCssVars(colors) };
}

export const BUILT_IN_SCHEMES: ColorSchemeDefinition[] = [
  builtIn("earthy", "Earthy", ["#5b4433", "#8a6b4f", "#d9c3a3", "#3a7d44", "#6b4f3a"]),
  builtIn("ocean", "Ocean", ["#0f3b5c", "#2a6f97", "#89c2d9", "#1d6fb8", "#0a2540"]),
  builtIn("forest", "Forest", ["#1b3a2b", "#2d6a4f", "#95d5b2", "#40916c", "#081c15"]),
  builtIn("sunset", "Sunset", ["#5c1a1a", "#b03a2e", "#f4a261", "#e76f51", "#421010"]),
  builtIn("lavender", "Lavender", ["#3b2a5c", "#6d5a92", "#c9b8e8", "#8a6fc0", "#2a1a44"]),
  builtIn("coffee", "Coffee", ["#3e2723", "#5d4037", "#d7ccc8", "#795548", "#2a1a17"]),
  builtIn("summer", "Summer", ["#f9f9f9", "#ffd166", "#06d6a0", "#ef476f", "#118ab2"]),
  builtIn("olive", "Olive", ["#3d4216", "#6b7a2f", "#c3d166", "#8a9a3a", "#2c300f"]),
  builtIn("fiery-ocean", "Fiery Ocean", ["#0d1b2a", "#1b263b", "#e76f51", "#f4a261", "#05101a"]),
  builtIn("steel", "Steel", ["#1f2937", "#374151", "#9ca3af", "#2563eb", "#111827"]),
  builtIn("pastel", "Pastel", ["#fdfbf7", "#fde2e4", "#fbb1bd", "#a2d2ff", "#fad2e1"]),
  builtIn("candy", "Candy", ["#ffe5ec", "#ffb3c6", "#ff8fab", "#fb6f92", "#ffc2d1"]),
  builtIn("ocean-blue", "Ocean Blue", ["#03045e", "#0077b6", "#90e0ef", "#00b4d8", "#023e8a"]),
  builtIn("meadow", "Meadow", ["#f6fff8", "#c4e0d8", "#a4c3b2", "#6b9080", "#eaf4f4"]),
  builtIn("golden", "Golden", ["#3b2f1c", "#8a6d3b", "#ffd97d", "#d4a017", "#4a3a17"]),
  builtIn("beach", "Beach", ["#e0fbfc", "#bcd4de", "#98c1d9", "#3d5a80", "#d9e6f2"]),
];

/** Resolve a scheme by id, searching built-ins first (custom handled by caller). */
export function findBuiltInScheme(schemeId: string): ColorSchemeDefinition | undefined {
  return BUILT_IN_SCHEMES.find((s) => s.schemeId === schemeId);
}

/** Generate a schemeId from a name (lowercase, non-alnum → '-'). */
export function schemeIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}