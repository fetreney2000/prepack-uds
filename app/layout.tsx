import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Sistem Pengurusan Prabungkus Ubat",
  description: "Sistem Pengurusan Prabungkus Ubat — Jabatan Farmasi, Hospital Keningau",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ms"
      className={cn("h-full", "antialiased", geist.variable, geistMono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
