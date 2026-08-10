import type { Metadata } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ColorSchemeProvider } from "@/providers/color-scheme-provider";
import { Toaster } from "@/components/ui/sonner";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-sans" });
const shareTechMono = Share_Tech_Mono({ subsets: ["latin"], variable: "--font-mono", weight: "400" });

export const metadata: Metadata = {
  title: "Sistem Pengurusan Prabungkus Ubat",
  description: "Sistem Pengurusan Prabungkus Ubat — Jabatan Farmasi, Hospital Keningau",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ms"
      className={cn("h-full", "antialiased", orbitron.variable, shareTechMono.variable, "font-sans")}
      suppressHydrationWarning
    >
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