// Senarai Ubat — searchable/sortable/paginated medication master list (read-only, Phase 1)
"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { useUbatList, type UbatRecord } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function SenaraiUbatPage() {
  const { data, isLoading, isError, error } = useUbatList();

  const columns = useMemo<ColumnDef<UbatRecord>[]>(
    () => [
      {
        accessorKey: "namaUbat",
        header: "Nama Ubat",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.namaUbat}</div>
            {row.original.namaDagangan && (
              <div className="text-xs text-muted-foreground">{row.original.namaDagangan}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "deskripsiPrabungkus",
        header: "Deskripsi Prabungkus",
      },
      {
        accessorKey: "kategoriUbat",
        header: "Kategori",
        cell: ({ row }) => <Badge variant="secondary">{row.original.kategoriUbat}</Badge>,
      },
      {
        accessorKey: "unitSKU",
        header: "Unit SKU",
        cell: ({ row }) => row.original.unitSKU ?? "—",
      },
      {
        accessorKey: "saizPek",
        header: "Saiz Pek",
        cell: ({ row }) => row.original.saizPek ?? "—",
      },
      {
        accessorKey: "harga",
        header: "Harga (RM)",
        cell: ({ row }) =>
          row.original.harga != null ? `RM ${row.original.harga.toFixed(2)}` : "—",
      },
    ],
    [],
  );

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Senarai Ubat</h1>
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
          searchPlaceholder="Cari nama ubat atau kategori..."
        />
      )}
    </PageShell>
  );
}