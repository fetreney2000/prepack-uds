// Senarai Ubat placeholder — Phase 1 will render the medication master table
import { PageShell } from "@/components/page-shell";

export default function SenaraiUbatPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold mb-6">Senarai Ubat</h1>
      <p className="text-muted-foreground">
        Jadual senarai ubat (master) dengan carian, susun, dan pagination.
      </p>
    </PageShell>
  );
}