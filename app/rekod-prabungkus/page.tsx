// Rekod Prabungkus — searchable/sortable/paginated list with CRUD
"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { usePrabungkusList, type PrabungkusRecord } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PrabungkusForm } from "@/components/modals/prabungkus-form";
import { deletePrabungkus } from "@/app/actions/prabungkus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ArrowUpDown,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";

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
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PrabungkusRecord | null>(null);
  const [deleting, setDeleting] = useState<PrabungkusRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await deletePrabungkus(deleting.ID);
    setDeleteBusy(false);

    if (res.ok) {
      toast.success("Rekod dipadam.");
      queryClient.invalidateQueries({ queryKey: ["prabungkus"] });
      setDeleting(null);
    } else {
      toast.error(res.error ?? "Gagal memadam rekod.");
    }
  };

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
        header: "Tindakan",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Tindakan" />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Sunting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleting(row.original)}>
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                <span className="text-destructive">Padam</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Tambah Rekod
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
        <DataTable
          columns={columns}
          data={data ?? []}
          searchPlaceholder="Cari nama ubat, ID, atau deskripsi..."
        />
      )}

      {/* Create / Edit wizard modal */}
      <PrabungkusForm open={createOpen} onOpenChange={setCreateOpen} />
      <PrabungkusForm
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        editing={editing}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Rekod?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda pasti mahu memadam rekod ini? Tindakan ini tidak boleh
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleting && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-medium">{deleting.idPrabungkus}</dd>
              <dt className="text-muted-foreground">Ubat</dt>
              <dd>{deleting.namaUbat}</dd>
              <dt className="text-muted-foreground">Tarikh</dt>
              <dd>{formatDate(deleting.tarikh)}</dd>
            </dl>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteBusy}
              variant="destructive"
            >
              {deleteBusy ? "Memadam..." : "Padam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
