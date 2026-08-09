// UDS Rekod Label — searchable/sortable/paginated list
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { useUdsRekodLabelList, type UdsRekodLabel } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { UdsRekodLabelForm } from "@/components/modals/uds-rekod-label-form";
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
import { toast } from "sonner";
import { deleteUdsRekodLabel } from "@/app/actions/uds";
import { Plus, Printer, Pencil, Trash2 } from "lucide-react";

export default function UdsRekodLabelPage() {
  const { data, isLoading, isError, error } = useUdsRekodLabelList();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UdsRekodLabel | null>(null);
  const [deleting, setDeleting] = useState<UdsRekodLabel | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await deleteUdsRekodLabel(deleting.ID);
    setDeleteBusy(false);
    if (res.ok) {
      toast.success("Rekod dipadam.");
      queryClient.invalidateQueries({ queryKey: ["uds-rekod-label"] });
      queryClient.invalidateQueries({ queryKey: ["uds-laporan"] });
      setDeleting(null);
    } else {
      toast.error(res.error ?? "Gagal memadam rekod.");
    }
  };

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
        header: "Tindakan",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cetak label"
              render={<Link href={`/uds/rekod-label/${row.original.ID}/print`} />}
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sunting rekod"
              onClick={() => setEditing(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Padam rekod"
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Senarai Rekod Label UDS</h1>
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
          searchPlaceholder="Cari rujukan, nama ubat, atau penyedia..."
        />
      )}

      <UdsRekodLabelForm
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <UdsRekodLabelForm
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        editing={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Rekod?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda pasti mahu memadam rekod ini? Tindakan ini tidak boleh dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleting && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
              <dt className="text-muted-foreground">Rujukan</dt>
              <dd className="font-medium">{deleting.Rujukan}</dd>
              <dt className="text-muted-foreground">Tarikh</dt>
              <dd>{formatDate(deleting.Tarikh)}</dd>
              <dt className="text-muted-foreground">Nama Ubat</dt>
              <dd>{deleting.NamaUbat}</dd>
              <dt className="text-muted-foreground">Kekuatan</dt>
              <dd>{deleting.Kekuatan ?? "—"}</dd>
              <dt className="text-muted-foreground">Kelompok</dt>
              <dd>{deleting.Kelompok ?? "—"}</dd>
              <dt className="text-muted-foreground">Luput</dt>
              <dd>{deleting.Luput ?? "—"}</dd>
              <dt className="text-muted-foreground">Kuantiti</dt>
              <dd>{deleting.Kuantiti}</dd>
              <dt className="text-muted-foreground">Penyedia</dt>
              <dd>{deleting.Penyedia ?? "—"}</dd>
            </dl>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/80">
              {deleteBusy ? "Memadam..." : "Padam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}