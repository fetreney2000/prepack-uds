// Theme provider — wraps next-themes ThemeProvider with the class
// strategy so it toggles the `.dark` class on <html> (matching the
// `.dark` block in globals.css).
//
// The chosen theme is persisted to localStorage and stays until the user
// changes it (no automatic follow of the OS preference).
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
      defaultTheme="light"
      enableSystem={false}
      storageKey="theme"
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}