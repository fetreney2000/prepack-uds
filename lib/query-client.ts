// TanStack Query client configuration
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 min default
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Returns a shared QueryClient on the browser (singleton) or a fresh
 * one per request on the server.
 */
export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}