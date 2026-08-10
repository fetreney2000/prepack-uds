// UDS Senarai Ubat — searchable/sortable/paginated UDS med list
"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { useUdsUbatList, type UdsUbat } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UdsUbatForm } from "@/components/modals/uds-ubat-form";
import { Plus } from "lucide-react";

export default function UdsSenaraiUbatPage() {
  const { data, isLoading, isError, error } = useUdsUbatList();
  const [createOpen, setCreateOpen] = useState(false);

  const columns = useMemo<ColumnDef<UdsUbat>[]>(
    () => [
      {
        accessorKey: "Nama",
        header: "Nama",
        cell: ({ row }) => <span className="font-medium">{row.original.Nama}</span>,
      },
      {
        accessorKey: "Kekuatan",
        header: "Kekuatan",
        cell: ({ row }) =>
          row.original.Kekuatan ? <Badge variant="secondary">{row.original.Kekuatan}</Badge> : "—",
      },
    ],
    [],
  );

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Senarai Ubat UDS</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Tambah Ubat
        </Button>
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
        <DataTable columns={columns} data={data ?? []} searchPlaceholder="Cari nama ubat..." />
      )}

      <UdsUbatForm open={createOpen} onOpenChange={setCreateOpen} />
    </PageShell>
  );
}