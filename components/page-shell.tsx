// Shared page shell — wraps children with navigation + container
import { Navigation } from "@/components/navigation";
import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="container mx-auto flex-1 px-4 py-6">{children}</main>
    </div>
  );
}