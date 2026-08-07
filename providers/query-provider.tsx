// TanStack Query provider — client component
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { getQueryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => getQueryClient());
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}