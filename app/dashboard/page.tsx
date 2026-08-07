// Dashboard placeholder — Phase 1 will render stat cards + 12-month table
import { PageShell } from "@/components/page-shell";

export default function DashboardPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold mb-6">Papan Pemuka</h1>
      <p className="text-muted-foreground">
        Ringkasan bulan semasa, YTD, dan jadual 12 bulan akan dipaparkan di sini.
      </p>
    </PageShell>
  );
}