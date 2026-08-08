import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import { ColorSchemeProvider } from "@/providers/color-scheme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistem Pengurusan Prabungkus Ubat",
  description: "Sistem Pengurusan Prabungkus Ubat — Jabatan Farmasi, Hospital Keningau",
};

// Inline pre-render script: apply cached color-scheme CSS vars before
// React hydrates (mirrors the original's inline script in index.pug).
const colorPreload = `(function(){try{var s=localStorage.getItem("prepack-color-scheme")||"light";var v=JSON.parse(localStorage.getItem("prepack-color-vars")||"{}");var r=document.documentElement;for(var k in v){if(Object.prototype.hasOwnProperty.call(v,k)){r.style.setProperty(k,v[k]);}}r.dataset.colorScheme=s;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ms"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorPreload }} />
      </head>
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <ColorSchemeProvider>{children}</ColorSchemeProvider>
        </QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}