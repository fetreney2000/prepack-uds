// Tetapan placeholder — password-gated page (Phase 4)
// Will contain: categories, units, label/worksheet types, color
// schemes, year-scoped running numbers, and password change.
import { PageShell } from "@/components/page-shell";

export default function TetapanPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold mb-6">Tetapan</h1>
      <p className="text-muted-foreground">
        Tetapan sistem (dilindungi kata laluan pada fasa seterusnya).
      </p>
    </PageShell>
  );
}