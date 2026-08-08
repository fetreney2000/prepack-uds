// Rekod Prabungkus — searchable/sortable/paginated list (read-only, Phase 1)
"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { usePrabungkusList, type PrabungkusRecord } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown } from "lucide-react";

export default function RekodPrabungkusPage() {
  const { data, isLoading, isError, error } = usePrabungkusList();

  const columns = useMemo<ColumnDef<PrabungkusRecord>[]>(
    () => [
      {
        accessorKey: "tarikh",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Tarikh <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => formatDate(row.original.tarikh),
      },
      {
        accessorKey: "idPrabungkus",
        header: "ID Prabungkus",
      },
      {
        accessorKey: "namaUbat",
        header: "Nama Ubat",
      },
      {
        accessorKey: "deskripsiPek",
        header: "Deskripsi Pek",
      },
      {
        accessorKey: "jumlahPekDihasilkan",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Jumlah Pek <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => row.original.jumlahPekDihasilkan ?? "—",
      },
    ],
    [],
  );

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Rekod Prabungkus</h1>
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
          searchPlaceholder="Cari nama ubat, ID, atau deskripsi..."
        />
      )}
    </PageShell>
  );
}