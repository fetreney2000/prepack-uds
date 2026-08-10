// UDS Senarai Ubat — Tambah Ubat form modal
// Simple2-field dialog (Nama, Kekuatan) wired to createUdsUbat server action.
"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createUdsUbat, updateUdsUbat } from "@/app/actions/uds";
import type { UdsUbat } from "@/lib/queries";

const EMPTY = { Nama: "", Kekuatan: "" };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: UdsUbat | null;
}

export function UdsUbatForm({ open, onOpenChange, editing = null }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          Nama: editing.Nama,
          Kekuatan: editing.Kekuatan ?? "",
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!form.Nama.trim()) {
      toast.error("Nama ubat diperlukan.");
      return;
    }
    setSaving(true);
    const payload = {
      Nama: form.Nama,
      Kekuatan: form.Kekuatan || null,
    };
    const res = editing
      ? await updateUdsUbat(editing.ID, payload)
      : await createUdsUbat(payload);
    setSaving(false);

    if (res.ok) {
      toast.success(editing ? "Ubat dikemas kini." : "Ubat baharu disimpan.");
      queryClient.invalidateQueries({ queryKey: ["uds-ubat"] });
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Gagal menyimpan ubat.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Sunting Ubat UDS" : "Tambah Ubat UDS"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Kemas kini butiran ubat di bawah."
              : "Isi butiran ubat baharu di bawah."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="uds-nama">Nama</Label>
            <Input id="uds-nama" value={form.Nama} onChange={set("Nama")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="uds-kekuatan">Kekuatan</Label>
            <Input id="uds-kekuatan" value={form.Kekuatan} onChange={set("Kekuatan")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
