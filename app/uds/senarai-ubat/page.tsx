// UDS Senarai Ubat — searchable/sortable/paginated UDS med list
"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { useUdsUbatList, type UdsUbat } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { UdsUbatForm } from "@/components/modals/uds-ubat-form";
import { deleteUdsUbat } from "@/app/actions/uds";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

export default function UdsSenaraiUbatPage() {
  const { data, isLoading, isError, error } = useUdsUbatList();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UdsUbat | null>(null);
  const [deleting, setDeleting] = useState<UdsUbat | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await deleteUdsUbat(deleting.ID);
    setDeleteBusy(false);

    if (res.ok) {
      toast.success("Ubat dipadam.");
      queryClient.invalidateQueries({ queryKey: ["uds-ubat"] });
      setDeleting(null);
    } else {
      toast.error(res.error ?? "Gagal memadam ubat.");
    }
  };

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
      {
        id: "actions",
        header: "Tindakan",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sunting ubat"
              onClick={() => setEditing(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Padam ubat"
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
      <UdsUbatForm
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        editing={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Ubat?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda pasti mahu memadam ubat ini? Tindakan ini tidak boleh dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleting && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
              <dt className="text-muted-foreground">Nama</dt>
              <dd className="font-medium">{deleting.Nama}</dd>
              <dt className="text-muted-foreground">Kekuatan</dt>
              <dd>{deleting.Kekuatan ?? "—"}</dd>
            </dl>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteBusy} variant="destructive">
              {deleteBusy ? "Memadam..." : "Padam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
