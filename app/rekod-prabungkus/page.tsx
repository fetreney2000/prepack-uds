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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ArrowUpDown, FileText, MoreHorizontal, Printer } from "lucide-react";

/** Trigger a download of the worksheet or label DOCX (download-only). */
function downloadDocument(kind: "worksheet" | "label", record: PrabungkusRecord) {
  const url = `/api/document/${kind}/${record.ID}`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  toast.success(
    kind === "worksheet"
      ? `Kertas kerja ${record.idPrabungkus} sedang dimuat turun.`
      : `Label ${record.idPrabungkus} sedang dimuat turun.`,
  );
}

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
        cell: ({ row }) => <span className="font-medium">{row.original.idPrabungkus ?? "—"}</span>,
      },
      {
        accessorKey: "namaUbat",
        header: "Nama Ubat",
        cell: ({ row }) => row.original.namaUbat ?? "—",
      },
      {
        accessorKey: "deskripsiPek",
        header: "Deskripsi Pek",
        cell: ({ row }) => row.original.deskripsiPek ?? "—",
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
      {
        id: "actions",
        header: "Cetak",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Cetak dokumen" />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => downloadDocument("worksheet", row.original)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Kertas Kerja
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => downloadDocument("label", row.original)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Label
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
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