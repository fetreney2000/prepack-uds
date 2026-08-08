// Theme provider — wraps next-themes ThemeProvider with the class
// strategy so it toggles the `.dark` class on <html> (matching the
// `.dark` block in globals.css).
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({
  children,
  ...props
}: Omit<ThemeProviderProps, "attribute" | "defaultTheme" | "enableSystem"> & {
  children: ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}