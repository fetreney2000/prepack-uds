// UDS Senarai Ubat placeholder — Phase 1 will render the UDS med list
import { PageShell } from "@/components/page-shell";

export default function UdsSenaraiUbatPage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold mb-6">Senarai Ubat UDS</h1>
      <p className="text-muted-foreground">
        Jadual senarai ubat UDS dengan carian, susun, dan pagination.
      </p>
    </PageShell>
  );
}