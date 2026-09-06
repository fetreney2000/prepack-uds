// Senarai Ubat — searchable/sortable/paginated medication master list with CRUD
"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { VisibilityState } from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { DataTable } from "@/components/tables/data-table";
import { useUbatList, type UbatRecord } from "@/lib/queries";
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
import { UbatForm } from "@/components/modals/ubat-form";
import { deleteUbat } from "@/app/actions/ubat";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

const ubatColumnVisibility: VisibilityState = {
  deskripsiPrabungkus: false,
  unitSKU: false,
  saizPek: false,
};

function renderUbatDetail(row: UbatRecord) {
  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: "Deskripsi Prabungkus", value: row.deskripsiPrabungkus },
    { label: "Unit SKU", value: row.unitSKU },
    { label: "Unit PKU", value: row.unitPKU },
    { label: "Saiz Pek", value: row.saizPek },
    { label: "Pengilang", value: row.pengilang },
    { label: "No. MAL", value: row.nomborMAL },
    { label: "Jangka Hayat", value: row.jangkaHayat != null ? `${row.jangkaHayat} bulan` : null },
    { label: "Arahan Tambahan", value: row.arahanTambahan },
  ];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
      {fields.map((f) => (
        <div key={f.label}>
          <dt className="text-muted-foreground">{f.label}</dt>
          <dd className="font-medium">{f.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function SenaraiUbatPage() {
  const { data, isLoading, isError, error } = useUbatList();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UbatRecord | null>(null);
  const [deleting, setDeleting] = useState<UbatRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await deleteUbat(deleting.ID);
    setDeleteBusy(false);

    if (res.ok) {
      toast.success("Ubat dipadam.");
      queryClient.invalidateQueries({ queryKey: ["ubat"] });
      setDeleting(null);
    } else {
      toast.error(res.error ?? "Gagal memadam ubat.");
    }
  };

  const columns = useMemo<ColumnDef<UbatRecord>[]>(
    () => [
      {
        accessorKey: "namaUbat",
        header: "Nama Ubat",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.namaUbat}</div>
            {row.original.namaDagangan && (
              <div className="text-xs text-muted-foreground">
                {row.original.namaDagangan}
              </div>
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
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.kategoriUbat}</Badge>
        ),
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
          row.original.harga != null
            ? `RM ${row.original.harga.toFixed(2)}`
            : "—",
      },
      {
        id: "actions",
        header: "Tindakan",
        enableHiding: false,
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
        <h1 className="text-2xl font-semibold">Senarai Ubat</h1>
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
        <DataTable
          columns={columns}
          data={data ?? []}
          searchPlaceholder="Cari nama ubat atau kategori..."
          initialColumnVisibility={ubatColumnVisibility}
          renderDetailPanel={renderUbatDetail}
        />
      )}

      {/* Create / Edit wizard modal */}
      <UbatForm open={createOpen} onOpenChange={setCreateOpen} />
      <UbatForm
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
            <AlertDialogTitle>Padam Ubat?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda pasti mahu memadam ubat ini? Tindakan ini tidak boleh
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleting && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
              <dt className="text-muted-foreground">Nama</dt>
              <dd className="font-medium">{deleting.namaUbat}</dd>
              <dt className="text-muted-foreground">Kategori</dt>
              <dd>{deleting.kategoriUbat}</dd>
              {deleting.namaDagangan && (
                <>
                  <dt className="text-muted-foreground">Nama Dagangan</dt>
                  <dd>{deleting.namaDagangan}</dd>
                </>
              )}
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
