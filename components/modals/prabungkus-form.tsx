// Rekod Prabungkus — Tambah Rekod form modal
// Wires createPrabungkus (transactional PP-NNNN/YY-X reservation) with a live
// ID Prabungkus preview, a shadcn Combobox for the medication master, and the
// exact expiry + pek/baki calculations from lib/biz.
"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useUbatList, type UbatRecord } from "@/lib/queries";
import { createPrabungkus, previewPrepackId } from "@/app/actions/prabungkus";
import { todayInKl, formatDate } from "@/lib/format";
import { calculateTarikhLuputBaharu } from "@/lib/biz/luput";
import { calculatePekAndBaki } from "@/lib/biz/pek-baki";

const today = todayInKl;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EMPTY = {
  tarikh: today(),
  nomborKelompok: "",
  tarikhLuputAsal: "",
  kuantiti: "",
  saizPek: "",
  hargaSetiapPek: "",
  deskripsiPek: "",
  arahanTambahan: "",
  namaDagangan: "",
};

export function PrabungkusForm({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: ubatList } = useUbatList();

  const [form, setForm] = useState(EMPTY);
  const [ubo, setUbo] = useState<UbatRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const items = ubatList ?? [];

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setUbo(null);
      setPreview(null);
    }
  }, [open]);

  const kuantiti = form.kuantiti.trim() === "" ? null : parseInt(form.kuantiti, 10);
  const saizPek = form.saizPek.trim() === "" ? null : parseFloat(form.saizPek);
  const hargaSetiapPek = form.hargaSetiapPek.trim() === "" ? null : parseFloat(form.hargaSetiapPek);

  const { jumlahPekDihasilkan, baki } = useMemo(
    () => calculatePekAndBaki(kuantiti, saizPek),
    [kuantiti, saizPek],
  );

  const tarikhLuputBaharu = useMemo(
    () =>
      calculateTarikhLuputBaharu(
        ubo?.jangkaHayat ?? 0,
        form.tarikh,
        form.tarikhLuputAsal || null,
      ),
    [ubo, form.tarikh, form.tarikhLuputAsal],
  );

  useEffect(() => {
    let cancelled = false;
    const kategori = ubo?.kategoriUbat ?? "";
    if (!open || !kategori || !form.tarikh) {
      setPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await previewPrepackId(kategori, form.tarikh);
      if (!cancelled && res.ok) setPreview(res.data ?? null);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ubo, form.tarikh, open]);

  const handleSubmit = async () => {
    if (!ubo) {
      toast.error("Sila pilih ubat dari senarai.");
      return;
    }
    if (!form.tarikh) {
      toast.error("Tarikh diperlukan.");
      return;
    }
    if (kuantiti !== null && (isNaN(kuantiti) || kuantiti < 0)) {
      toast.error("Kuantiti perlu integer >= 0.");
      return;
    }
    if (saizPek !== null && isNaN(saizPek)) {
      toast.error("Saiz pek tidak sah.");
      return;
    }
    if (hargaSetiapPek !== null && isNaN(hargaSetiapPek)) {
      toast.error("Harga setiap pek tidak sah.");
      return;
    }

    setSaving(true);
    const res = await createPrabungkus({
      idUbat: ubo.ID,
      namaUbat: ubo.namaUbat,
      kategoriUbat: ubo.kategoriUbat,
      tarikh: form.tarikh,
      namaDagangan: form.namaDagangan || ubo.namaDagangan,
      nomborKelompok: form.nomborKelompok || null,
      tarikhLuputAsal: form.tarikhLuputAsal || null,
      tarikhLuputBaharu,
      pengilang: ubo.pengilang,
      nomborMAL: ubo.nomborMAL,
      kuantitiUntukDiprabungkus: kuantiti,
      saizPek,
      deskripsiPek: form.deskripsiPek || null,
      hargaSetiapPek,
      jumlahPekDihasilkan,
      baki,
      arahanTambahan: form.arahanTambahan || ubo.arahanTambahan,
    });
    setSaving(false);

    if (res.ok) {
      toast.success(`Rekod ${res.data?.idPrabungkus} disimpan.`);
      queryClient.invalidateQueries({ queryKey: ["prabungkus"] });
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Gagal menyimpan rekod.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]">
        <DialogHeader>
          <DialogTitle>Tambah Rekod Prabungkus</DialogTitle>
          <DialogDescription>
            ID Prabungkus dijana automatik mengikut kategori dan tahun. Isi butiran prabungkus di
            bawah.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="pp-tarikh">Tarikh</Label>
              <Input id="pp-tarikh" type="date" value={form.tarikh} onChange={set("tarikh")} />
            </div>
            <div className="space-y-1">
              <Label>ID Prabungkus</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {preview ?? "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {ubo?.kategoriUbat ?? "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-nama-dagangan">Nama Dagangan</Label>
              <Input
                id="pp-nama-dagangan"
                value={form.namaDagangan}
                onChange={set("namaDagangan")}
                readOnly
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nama Ubat</Label>
            <Combobox
              items={items}
              itemToStringLabel={(m) => m.namaUbat}
              itemToStringValue={(m) => m.namaUbat}
              value={ubo}
              onValueChange={(m) => {
                setUbo(m);
                setForm((f) => ({
                  ...f,
                  namaDagangan: m?.namaDagangan ?? "",
                  saizPek: m?.saizPek != null ? String(m.saizPek) : "",
                  hargaSetiapPek: m?.harga != null ? String(m.harga) : "",
                  deskripsiPek: m?.deskripsiPrabungkus ?? "",
                  arahanTambahan: m?.arahanTambahan ?? "",
                }));
              }}
            >
              <ComboboxInput />
              <ComboboxContent>
                <ComboboxEmpty>Tiada ubat dijumpai.</ComboboxEmpty>
                <ComboboxList>
                  {(m) => (
                    <ComboboxItem key={m.ID} value={m}>
                      {m.namaUbat}
                      {m.namaDagangan && (
                        <span className="ml-2 text-xs text-muted-foreground">{m.namaDagangan}</span>
                      )}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="pp-kelompok">Nombor Kelompok</Label>
              <Input
                id="pp-kelompok"
                value={form.nomborKelompok}
                onChange={set("nomborKelompok")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-luput-asal">Tarikh Luput Asal</Label>
              <Input
                id="pp-luput-asal"
                type="date"
                value={form.tarikhLuputAsal}
                onChange={set("tarikhLuputAsal")}
              />
            </div>
            <div className="space-y-1">
              <Label>Tarikh Luput Baharu</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {formatDate(tarikhLuputBaharu) || "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-kuantiti">Kuantiti</Label>
              <Input
                id="pp-kuantiti"
                type="number"
                min={0}
                value={form.kuantiti}
                onChange={set("kuantiti")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Pengilang</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {ubo?.pengilang ?? "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Nombor MAL</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {ubo?.nomborMAL ?? "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-saiz-pek">Saiz Pek</Label>
              <Input
                id="pp-saiz-pek"
                type="number"
                min={0}
                value={form.saizPek}
                onChange={set("saizPek")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pp-harga">Harga / Pek (RM)</Label>
              <Input
                id="pp-harga"
                type="number"
                min={0}
                step="0.01"
                value={form.hargaSetiapPek}
                onChange={set("hargaSetiapPek")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Jumlah Pek</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {jumlahPekDihasilkan ?? "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Baki</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {baki ?? "—"}
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pp-deskripsi">Deskripsi Pek</Label>
              <Input
                id="pp-deskripsi"
                value={form.deskripsiPek}
                onChange={set("deskripsiPek")}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="pp-arahan">Arahan Tambahan</Label>
            <Input
              id="pp-arahan"
              value={form.arahanTambahan}
              onChange={set("arahanTambahan")}
            />
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
