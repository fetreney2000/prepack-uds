import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ColorSchemeProvider } from "@/providers/color-scheme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistem Pengurusan Prabungkus Ubat",
  description: "Sistem Pengurusan Prabungkus Ubat — Jabatan Farmasi, Hospital Keningau",
};

// Inline pre-render script: apply the correct color-scheme CSS vars
// before React hydrates (mirrors the original's inline script in
// index.pug). Dark-aware: when the resolved theme is dark, apply the
// design-system dark palette instead of the cached light vars, so there
// is no light-flash on first paint.
const colorPreload = `(function(){try{
var r=document.documentElement;
var dark=(localStorage.getItem("theme")==="dark")||((!localStorage.getItem("theme"))&&window.matchMedia("(prefers-color-scheme: dark)").matches);
if(dark){r.classList.add("dark");}
var s=localStorage.getItem("prepack-color-scheme")||"light";
var v=JSON.parse(localStorage.getItem("prepack-color-vars")||"{}");
if(dark){v=JSON.parse('${JSON.stringify(requireDarkVarsForPreload())}');}
for(var k in v){if(Object.prototype.hasOwnProperty.call(v,k)){r.style.setProperty(k,v[k]);}}
r.dataset.colorScheme=s;
}catch(e){}})();`;

// Inlined into the preload script above (dark palette), so the string
// is available at build time without a client import.
function requireDarkVarsForPreload(): Record<string, string> {
  return {
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
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ms"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorPreload }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <QueryProvider>
            <ColorSchemeProvider>{children}</ColorSchemeProvider>
          </QueryProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}