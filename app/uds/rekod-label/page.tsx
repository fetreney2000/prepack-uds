// UDS Rekod Label — searchable/sortable/paginated list (read-only, Phase 1)
"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { useUdsRekodLabelList, type UdsRekodLabel } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

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