// Laporan placeholder — Phase 1 will render daily/monthly/yearly reports
import { PageShell } from "@/components/page-shell";

export default function LaporanPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold mb-6">Laporan</h1>
      <p className="text-muted-foreground">
        Laporan harian, bulanan, dan tahunan akan dipaparkan di sini.
      </p>
    </PageShell>
  );
}