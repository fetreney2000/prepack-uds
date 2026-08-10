// Color scheme definitions — built-ins + CSS derivation
// The default "light" scheme is the Bold Wikipedia design-system theme
// (see app/globals.css). Other schemes derive a full token set from a
// 5-color palette so every scheme renders with the same design system.
import type { ColorSchemeDefinition } from "@/stores/color-scheme-store";

const darkForeground = "oklch(0.8717 0.0093 258.3382)";
const sansFont = "'Orbitron', sans-serif";
const monoFont = "'Share Tech Mono', monospace";

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
    "--card": surface,
    "--card-foreground": darkForeground,
    "--popover": surface,
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
    "--radius": "0rem",
    "--font-sans": sansFont,
    "--font-mono": monoFont,
    "--shadow-color": "#000000",
    "--shadow-opacity": "0.5",
    "--shadow-blur": "12px",
    "--shadow-spread": "2px",
    "--shadow-x": "2px",
    "--shadow-y": "2px",
    "--letter-spacing": "0.1em",
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
    colors: ["#403060", "#382858", "#aa7040", "#e05020", "#b0a0c0"],
    css: {
      "--background": "oklch(0.2500 0.0112 254.0422)",
      "--foreground": "oklch(0.8717 0.0093 258.3382)",
      "--card": "oklch(0.2212 0.0108 260.6784)",
      "--card-foreground": "oklch(0.8717 0.0093 258.3382)",
      "--popover": "oklch(0.2212 0.0108 260.6784)",
      "--popover-foreground": "oklch(0.8717 0.0093 258.3382)",
      "--primary": "oklch(0.5412 0.2127 24.7912)",
      "--primary-foreground": "oklch(1.0000 0 0)",
      "--secondary": "oklch(0.4244 0.1809 265.6377)",
      "--secondary-foreground": "oklch(1.0000 0 0)",
      "--muted": "oklch(0.3186 0.0165 255.6397)",
      "--muted-foreground": "oklch(0.7137 0.0192 261.3246)",
      "--accent": "oklch(0.6658 0.1574 58.3183)",
      "--accent-foreground": "oklch(0.2212 0.0108 260.6784)",
      "--destructive": "oklch(0.4437 0.1613 26.8994)",
      "--destructive-foreground": "oklch(1.0000 0 0)",
      "--border": "oklch(0.3729 0.0306 259.7328)",
      "--input": "oklch(0.2212 0.0108 260.6784)",
      "--ring": "oklch(0.5412 0.2127 24.7912)",
      "--chart-1": "oklch(0.5412 0.2127 24.7912)",
      "--chart-2": "oklch(0.4244 0.1809 265.6377)",
      "--chart-3": "oklch(0.6658 0.1574 58.3183)",
      "--chart-4": "oklch(0.4461 0.0263 256.8018)",
      "--chart-5": "oklch(0.4907 0.2412 292.5809)",
      "--sidebar": "oklch(0.2212 0.0108 260.6784)",
      "--sidebar-foreground": "oklch(0.8717 0.0093 258.3382)",
      "--sidebar-primary": "oklch(0.5412 0.2127 24.7912)",
      "--sidebar-primary-foreground": "oklch(1.0000 0 0)",
      "--sidebar-accent": "oklch(0.3186 0.0165 255.6397)",
      "--sidebar-accent-foreground": "oklch(0.6658 0.1574 58.3183)",
      "--sidebar-border": "oklch(0.3729 0.0306 259.7328)",
      "--sidebar-ring": "oklch(0.5412 0.2127 24.7912)",
      "--radius": "0rem",
      "--font-sans": "'Orbitron', sans-serif",
      "--font-mono": "'Share Tech Mono', monospace",
      "--shadow-color": "#000000",
      "--shadow-opacity": "0.5",
      "--shadow-blur": "12px",
      "--shadow-spread": "2px",
      "--shadow-x": "2px",
      "--shadow-y": "2px",
      "--letter-spacing": "0.1em",
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
  "--background": "oklch(0.1773 0.0089 264.3183)",
  "--foreground": "oklch(0.9276 0.0058 264.5313)",
  "--card": "oklch(0.2086 0.0128 264.2461)",
  "--card-foreground": "oklch(0.9276 0.0058 264.5313)",
  "--popover": "oklch(0.2086 0.0128 264.2461)",
  "--popover-foreground": "oklch(0.9276 0.0058 264.5313)",
  "--primary": "oklch(0.5771 0.2152 27.3250)",
  "--primary-foreground": "oklch(1.0000 0 0)",
  "--secondary": "oklch(0.5461 0.2152 262.8809)",
  "--secondary-foreground": "oklch(1.0000 0 0)",
  "--muted": "oklch(0.2875 0.0163 259.7887)",
  "--muted-foreground": "oklch(0.7137 0.0192 261.3246)",
  "--accent": "oklch(0.7686 0.1647 70.0804)",
  "--accent-foreground": "oklch(0.1773 0.0089 264.3183)",
  "--destructive": "oklch(0.5054 0.1905 27.5181)",
  "--destructive-foreground": "oklch(1.0000 0 0)",
  "--border": "oklch(0.3230 0.0219 259.3809)",
  "--input": "oklch(0.1773 0.0089 264.3183)",
  "--ring": "oklch(0.5771 0.2152 27.3250)",
  "--chart-1": "oklch(0.5771 0.2152 27.3250)",
  "--chart-2": "oklch(0.5461 0.2152 262.8809)",
  "--chart-3": "oklch(0.7686 0.1647 70.0804)",
  "--chart-4": "oklch(0.3729 0.0306 259.7328)",
  "--chart-5": "oklch(0.5413 0.2466 293.0090)",
  "--sidebar": "oklch(0.2086 0.0128 264.2461)",
  "--sidebar-foreground": "oklch(0.9276 0.0058 264.5313)",
  "--sidebar-primary": "oklch(0.5771 0.2152 27.3250)",
  "--sidebar-primary-foreground": "oklch(1.0000 0 0)",
  "--sidebar-accent": "oklch(0.1773 0.0089 264.3183)",
  "--sidebar-accent-foreground": "oklch(0.7686 0.1647 70.0804)",
  "--sidebar-border": "oklch(0.3230 0.0219 259.3809)",
  "--sidebar-ring": "oklch(0.5771 0.2152 27.3250)",
  "--radius": "0rem",
  "--font-sans": "'Orbitron', sans-serif",
  "--font-mono": "'Share Tech Mono', monospace",
  "--shadow-color": "#000000",
  "--shadow-opacity": "0.8",
  "--shadow-blur": "20px",
  "--shadow-spread": "4px",
  "--shadow-x": "4px",
  "--shadow-y": "4px",
  "--letter-spacing": "0.1em",
};

/** Generate a schemeId from a name (lowercase, non-alnum → '-'). */
export function schemeIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}