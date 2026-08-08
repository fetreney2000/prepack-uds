// Color scheme definitions — built-ins + CSS derivation
// The default "light" scheme is the Bold Wikipedia design-system theme
// (see app/globals.css). Other schemes derive a full token set from a
// 5-color palette so every scheme renders with the same design system.
import type { ColorSchemeDefinition } from "@/stores/color-scheme-store";

const darkForeground = "#f5f5f5";
const sansFont = '"Inter", "Segoe UI", "Helvetica Neue", sans-serif';
const monoFont = '"Geist Mono", monospace';

/**
 * Derive the full CSS variable set from a scheme's 5 colors:
 *   colors[0] background, colors[1] surface-alt, colors[2] accent,
 *   colors[3] primary, colors[4] text-primary/highlight.
 * Mirrors the Bold Wikipedia token set (radius, shadows, letter-spacing,
 * chart + sidebar tokens) so every scheme shares the design system.
 */
export function deriveCssVars(colors: string[]): Record<string, string> {
  const [bg, surface, accent, primary, highlight] = [
    colors[0] ?? "#ffffff",
    colors[1] ?? "#f4f4f5",
    colors[2] ?? "#e4e4e7",
    colors[3] ?? "#18181b",
    colors[4] ?? "#52525b",
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
    "--chart-1": primary,
    "--chart-2": accent,
    "--chart-3": highlight,
    "--chart-4": "#8b5cf6",
    "--chart-5": "#ec4899",
    "--sidebar": bg,
    "--sidebar-foreground": highlight,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": "#ffffff",
    "--sidebar-accent": surface,
    "--sidebar-accent-foreground": highlight,
    "--sidebar-border": accent,
    "--sidebar-ring": primary,
    "--radius": "0.125rem",
    "--font-sans": sansFont,
    "--font-mono": monoFont,
    "--shadow-color": "rgba(0, 0, 0, 0.1)",
    "--shadow-opacity": "0.05",
    "--shadow-blur": "4px",
    "--shadow-spread": "0px",
    "--shadow-offset-x": "0px",
    "--shadow-offset-y": "1px",
    "--letter-spacing": "0.0125em",
  };
}

/** Build a built-in scheme definition from id, name, and 5 colors. */
function builtIn(schemeId: string, name: string, colors: string[]): ColorSchemeDefinition {
  return { schemeId, name, colors, css: deriveCssVars(colors) };
}

export const BUILT_IN_SCHEMES: ColorSchemeDefinition[] = [
  {
    schemeId: "light",
    name: "Light",
    colors: ["#ffffff", "#f4f4f5", "#e4e4e7", "#1f6feb", "#52525b"],
    css: {
      "--background": "hsl(0 0% 100%)",
      "--foreground": "hsl(0 0% 15%)",
      "--card": "hsl(0 0% 100%)",
      "--card-foreground": "hsl(0 0% 15%)",
      "--popover": "hsl(0 0% 100%)",
      "--popover-foreground": "hsl(0 0% 15%)",
      "--primary": "hsl(214 85% 45%)",
      "--primary-foreground": "hsl(0 0% 100%)",
      "--secondary": "hsl(210 20% 96%)",
      "--secondary-foreground": "hsl(0 0% 15%)",
      "--muted": "hsl(0 0% 96%)",
      "--muted-foreground": "hsl(0 0% 45%)",
      "--accent": "hsl(214 85% 96%)",
      "--accent-foreground": "hsl(214 85% 35%)",
      "--destructive": "hsl(0 84% 44%)",
      "--destructive-foreground": "hsl(0 0% 100%)",
      "--border": "hsl(0 0% 82%)",
      "--input": "hsl(0 0% 90%)",
      "--ring": "hsl(214 85% 45%)",
      "--chart-1": "hsl(214 85% 45%)",
      "--chart-2": "hsl(160 84% 39%)",
      "--chart-3": "hsl(30 95% 45%)",
      "--chart-4": "hsl(280 75% 55%)",
      "--chart-5": "hsl(340 85% 50%)",
      "--sidebar": "hsl(0 0% 98%)",
      "--sidebar-foreground": "hsl(0 0% 25%)",
      "--sidebar-primary": "hsl(214 85% 45%)",
      "--sidebar-primary-foreground": "hsl(0 0% 100%)",
      "--sidebar-accent": "hsl(214 40% 94%)",
      "--sidebar-accent-foreground": "hsl(214 85% 35%)",
      "--sidebar-border": "hsl(0 0% 90%)",
      "--sidebar-ring": "hsl(214 85% 45%)",
      "--radius": "0.125rem",
      "--font-sans": '"Inter", "Segoe UI", "Helvetica Neue", sans-serif',
      "--font-mono": '"Geist Mono", monospace',
      "--shadow-color": "rgba(0, 0, 0, 0.1)",
      "--shadow-opacity": "0.05",
      "--shadow-blur": "4px",
      "--shadow-spread": "0px",
      "--shadow-offset-x": "0px",
      "--shadow-offset-y": "1px",
      "--letter-spacing": "0.0125em",
    },
  },
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

/**
 * Bold Wikipedia dark-theme CSS variables. Applied to `:root` when dark
 * mode is active. All built-in color schemes are light palettes, so dark
 * mode always uses this single design-system palette.
 */
export const DARK_SCHEME_CSS: Record<string, string> = {
  "--background": "hsl(0 0% 12%)",
  "--foreground": "hsl(0 0% 92%)",
  "--card": "hsl(0 0% 15%)",
  "--card-foreground": "hsl(0 0% 92%)",
  "--popover": "hsl(0 0% 15%)",
  "--popover-foreground": "hsl(0 0% 92%)",
  "--primary": "hsl(212 100% 75%)",
  "--primary-foreground": "hsl(212 100% 10%)",
  "--secondary": "hsl(0 0% 20%)",
  "--secondary-foreground": "hsl(0 0% 92%)",
  "--muted": "hsl(0 0% 18%)",
  "--muted-foreground": "hsl(0 0% 65%)",
  "--accent": "hsl(212 100% 20%)",
  "--accent-foreground": "hsl(212 100% 85%)",
  "--destructive": "hsl(0 75% 50%)",
  "--destructive-foreground": "hsl(0 0% 100%)",
  "--border": "hsl(0 0% 25%)",
  "--input": "hsl(0 0% 25%)",
  "--ring": "hsl(212 100% 75%)",
  "--chart-1": "hsl(212 100% 75%)",
  "--chart-2": "hsl(160 60% 55%)",
  "--chart-3": "hsl(40 90% 65%)",
  "--chart-4": "hsl(270 70% 70%)",
  "--chart-5": "hsl(330 80% 65%)",
  "--sidebar": "hsl(0 0% 10%)",
  "--sidebar-foreground": "hsl(0 0% 85%)",
  "--sidebar-primary": "hsl(212 100% 75%)",
  "--sidebar-primary-foreground": "hsl(212 100% 10%)",
  "--sidebar-accent": "hsl(0 0% 20%)",
  "--sidebar-accent-foreground": "hsl(0 0% 95%)",
  "--sidebar-border": "hsl(0 0% 22%)",
  "--sidebar-ring": "hsl(212 100% 75%)",
  "--radius": "0.125rem",
  "--font-sans": '"Inter", "Segoe UI", "Helvetica Neue", sans-serif',
  "--font-mono": '"Geist Mono", monospace',
  "--shadow-color": "rgba(0, 0, 0, 0.4)",
  "--shadow-opacity": "0.15",
  "--shadow-blur": "6px",
  "--shadow-spread": "0px",
  "--shadow-offset-x": "0px",
  "--shadow-offset-y": "2px",
  "--letter-spacing": "0.0125em",
};

/** Generate a schemeId from a name (lowercase, non-alnum → '-'). */
export function schemeIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}