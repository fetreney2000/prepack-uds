// UDS Rekod Label — searchable/sortable/paginated list (read-only, Phase 1)
"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { useUdsRekodLabelList, type UdsRekodLabel } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Printer } from "lucide-react";

/**
 * Print the UDS label PDF (§4.7). Fetches the PDF so we can read the
 * X-UDS-* headers for the toast, then opens the blob in a new tab.
 */
async function printLabel(record: UdsRekodLabel) {
  try {
    const res = await fetch(`/api/uds/${record.ID}/label.pdf`);
    if (!res.ok) {
      let detail = "Gagal menjana label.";
      try {
        const body = await res.json();
        if (body?.detail) detail = body.detail;
      } catch {
        // ignore parse failure
      }
      toast.error(detail);
      return;
    }
    const meta = {
      font: res.headers.get("X-UDS-Font"),
      fontSize: res.headers.get("X-UDS-Font-Size"),
      grid: res.headers.get("X-UDS-Grid"),
      cells: res.headers.get("X-UDS-Cells"),
      mode: res.headers.get("X-UDS-Mode"),
    };
    if (meta.font && meta.fontSize && meta.grid && meta.cells) {
      const content = [
        [record.NamaUbat, record.Kekuatan].filter(Boolean).join(" "),
        record.Kelompok,
        record.Luput,
      ]
        .filter(Boolean)
        .join(", ");
      toast.success(
        `${content} — ${meta.font} ${meta.fontSize}pt — ${meta.grid} (${meta.cells})`,
      );
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    toast.error("Gagal menjana label.");
  }
}

export default function UdsRekodLabelPage() {
  const { data, isLoading, isError, error } = useUdsRekodLabelList();

  const columns = useMemo<ColumnDef<UdsRekodLabel>[]>(
    () => [
      {
        accessorKey: "Tarikh",
        header: "Tarikh",
        cell: ({ row }) => formatDate(row.original.Tarikh),
      },
      {
        accessorKey: "Rujukan",
        header: "Rujukan",
        cell: ({ row }) => <span className="font-medium">{row.original.Rujukan}</span>,
      },
      {
        accessorKey: "NamaUbat",
        header: "Nama Ubat",
      },
      {
        accessorKey: "Kekuatan",
        header: "Kekuatan",
        cell: ({ row }) => row.original.Kekuatan ?? "—",
      },
      {
        accessorKey: "Kelompok",
        header: "Kelompok",
      },
      {
        accessorKey: "Luput",
        header: "Luput",
      },
      {
        accessorKey: "Kuantiti",
        header: "Kuantiti",
        cell: ({ row }) => row.original.Kuantiti,
      },
      {
        accessorKey: "Penyedia",
        header: "Penyedia",
        cell: ({ row }) => row.original.Penyedia ?? "—",
      },
      {
        id: "actions",
        header: "Cetak",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cetak label"
            onClick={() => printLabel(row.original)}
          >
            <Printer className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Senarai Rekod Label UDS</h1>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm mb-6">
          {error instanceof Error ? error.message : "Gagal memuatkan data."}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          searchPlaceholder="Cari rujukan, nama ubat, atau penyedia..."
        />
      )}
    </PageShell>
  );
}