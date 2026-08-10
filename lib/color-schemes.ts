// Color scheme definitions — built-ins + CSS derivation.
// The default scheme matches the Rose Pine tweakcn theme in app/globals.css.
import type { ColorSchemeDefinition } from "@/stores/color-scheme-store";

const lightForeground = "#575279";
const sansFont = "var(--font-geist), Geist, sans-serif";
const monoFont = "var(--font-geist-mono), 'Geist Mono', monospace";

/**
 * Derive the full CSS variable set from a scheme's 5 colors:
 *   colors[0] background, colors[1] surface-alt, colors[2] accent,
 *   colors[3] primary, colors[4] text-primary/highlight.
 * Mirrors the Rose Pine token set (radius, shadows, letter-spacing, chart,
 * font, and sidebar tokens) so every scheme shares the design system.
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
    "--foreground": lightForeground,
    "--primary": primary,
    "--primary-foreground": "#ffffff",
    "--accent": accent,
    "--accent-foreground": lightForeground,
    "--surface-alt": surface,
    "--text-primary": highlight,
    "--text-secondary": highlight,
    "--border": accent,
    "--ring": primary,
    "--card": surface,
    "--card-foreground": lightForeground,
    "--popover": surface,
    "--popover-foreground": lightForeground,
    "--secondary": surface,
    "--secondary-foreground": lightForeground,
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
    "--radius": "0rem",
    "--font-sans": sansFont,
    "--font-mono": monoFont,
    "--shadow-color": "#000000",
    "--shadow-opacity": "0.12",
    "--shadow-blur": "2px",
    "--shadow-spread": "0px",
    "--shadow-offset-x": "0px",
    "--shadow-offset-y": "1px",
    "--letter-spacing": "0em",
    "--spacing": "0.25rem",
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
    colors: ["#faf4ed", "#fffaf3", "#f2e9e1", "#575279", "#575279"],
    css: {
      "--background": "#faf4ed",
      "--foreground": "#575279",
      "--card": "#fffaf3",
      "--card-foreground": "#575279",
      "--popover": "#f2e9e1",
      "--popover-foreground": "#575279",
      "--primary": "#575279",
      "--primary-foreground": "#faf4ed",
      "--secondary": "#dfdad9",
      "--secondary-foreground": "#575279",
      "--muted": "#f4ede8",
      "--muted-foreground": "#797593",
      "--accent": "#f2e9e1",
      "--accent-foreground": "#575279",
      "--destructive": "#b4637a",
      "--destructive-foreground": "#faf4ed",
      "--border": "#cecacd",
      "--input": "#dfdad9",
      "--ring": "#907aa9",
      "--chart-1": "#ea9d34",
      "--chart-2": "#b4637a",
      "--chart-3": "#286983",
      "--chart-4": "#56949f",
      "--chart-5": "#907aa9",
      "--sidebar": "#fffaf3",
      "--sidebar-foreground": "#575279",
      "--sidebar-primary": "#907aa9",
      "--sidebar-primary-foreground": "#faf4ed",
      "--sidebar-accent": "#f2e9e1",
      "--sidebar-accent-foreground": "#575279",
      "--sidebar-border": "#dfdad9",
      "--sidebar-ring": "#907aa9",
      "--font-sans": sansFont,
      "--font-serif": "Georgia, serif",
      "--font-mono": monoFont,
      "--radius": "0.5rem",
      "--shadow-color": "#000000",
      "--shadow-opacity": "0.12",
      "--shadow-blur": "2px",
      "--shadow-spread": "0px",
      "--shadow-offset-x": "0px",
      "--shadow-offset-y": "1px",
      "--letter-spacing": "0em",
      "--spacing": "0.25rem",
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
 * Rose Pine dark-theme CSS variables. Applied to `:root` when dark mode is
 * active. All built-in color schemes are light palettes, so dark mode always
 * uses this single design-system palette.
 */
export const DARK_SCHEME_CSS: Record<string, string> = {
  "--background": "#191724",
  "--foreground": "#e0def4",
  "--card": "#1f1d2e",
  "--card-foreground": "#e0def4",
  "--popover": "#26233a",
  "--popover-foreground": "#e0def4",
  "--primary": "#e0def4",
  "--primary-foreground": "#191724",
  "--secondary": "#403d52",
  "--secondary-foreground": "#e0def4",
  "--muted": "#21202e",
  "--muted-foreground": "#908caa",
  "--accent": "#26233a",
  "--accent-foreground": "#e0def4",
  "--destructive": "#eb6f92",
  "--destructive-foreground": "#191724",
  "--border": "#403d52",
  "--input": "#524f67",
  "--ring": "#c4a7e7",
  "--chart-1": "#f6c177",
  "--chart-2": "#eb6f92",
  "--chart-3": "#31748f",
  "--chart-4": "#9ccfd8",
  "--chart-5": "#c4a7e7",
  "--sidebar": "#1f1d2e",
  "--sidebar-foreground": "#e0def4",
  "--sidebar-primary": "#c4a7e7",
  "--sidebar-primary-foreground": "#191724",
  "--sidebar-accent": "#26233a",
  "--sidebar-accent-foreground": "#e0def4",
  "--sidebar-border": "#403d52",
  "--sidebar-ring": "#c4a7e7",
  "--font-sans": sansFont,
  "--font-serif": "Georgia, serif",
  "--font-mono": monoFont,
  "--radius": "0.5rem",
  "--shadow-color": "#000000",
  "--shadow-opacity": "0.18",
  "--shadow-blur": "2px",
  "--shadow-spread": "0px",
  "--shadow-offset-x": "0px",
  "--shadow-offset-y": "1px",
  "--letter-spacing": "0em",
  "--spacing": "0.25rem",
};

/** Generate a schemeId from a name (lowercase, non-alnum → '-'). */
export function schemeIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
