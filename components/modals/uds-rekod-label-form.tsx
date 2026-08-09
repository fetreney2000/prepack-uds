// UDS Rekod Label — Tambah Rekod form modal
// Wires createUdsRekodLabel (server-generated, year-scoped Rujukan) with a
// live Rujukan preview, a shadcn Combobox for the UDS medication, and a
// shadcn date-picker (Popover + Calendar) for the luput field.
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, parse } from "date-fns";
import { useUdsUbatList, type UdsUbat } from "@/lib/queries";
import { createUdsRekodLabel, previewUdsRujukan } from "@/app/actions/uds";

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EMPTY = {
  Tarikh: today(),
  NamaUbat: "",
  Kekuatan: "",
  Kelompok: "",
  Luput: "",
  Kuantiti: "",
  Penyedia: "",
};

// UDS ubat as combobox items (value = Nama, label = Nama + Kekuatan).
function toItems(list: UdsUbat[]) {
  return list.map((m) => ({
    value: m.Nama,
    label: m.Kekuatan ? `${m.Nama} · ${m.Kekuatan}` : m.Nama,
    med: m,
  }));
}

export function UdsRekodLabelForm({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: ubatList } = useUdsUbatList();

  const [form, setForm] = useState(EMPTY);
  const [ubo, setUbo] = useState<UdsUbat | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const items = useMemo(() => toItems(ubatList ?? []), [ubatList]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Reset on open.
  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setUbo(null);
      setPreview(null);
    }
  }, [open]);

  // Live Rujukan preview from the chosen Tarikh (no reserve).
  useEffect(() => {
    let cancelled = false;
    if (!open || !form.Tarikh) {
      setPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await previewUdsRujukan(form.Tarikh);
      if (!cancelled && res.ok) setPreview(res.data ?? null);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.Tarikh, open]);

  const handleLuputSelect = (date?: Date) => {
    if (!date) return;
    // Store in the accepted expiry grammar: MM/YYYY.
    setForm((f) => ({ ...f, Luput: format(date, "MM/yyyy") }));
  };

  const selectedLuput = useMemo(() => {
    if (!/^\d{1,2}\/\d{4}$/.test(form.Luput)) return undefined;
    const d = parse(form.Luput, "MM/yyyy", new Date());
    return isNaN(d.getTime()) ? undefined : d;
  }, [form.Luput]);

  const handleSubmit = async () => {
    if (!form.NamaUbat.trim() || !form.Kelompok.trim() || !form.Luput.trim() || !form.Penyedia.trim()) {
      toast.error("Sila lengkapkan medan wajib.");
      return;
    }
    const kuantiti = parseInt(form.Kuantiti, 10);
    if (form.Kuantiti === "" || isNaN(kuantiti) || kuantiti < 0) {
      toast.error("Kuantiti perlu integer >= 0.");
      return;
    }
    setSaving(true);
    const res = await createUdsRekodLabel({
      Tarikh: form.Tarikh,
      NamaUbat: form.NamaUbat,
      Kekuatan: form.Kekuatan || null,
      Kelompok: form.Kelompok,
      Luput: form.Luput,
      Kuantiti: kuantiti,
      Penyedia: form.Penyedia,
      NamaUbatID: ubo?.ID ?? null,
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Rekod ${res.data?.Rujukan} disimpan.`);
      queryClient.invalidateQueries({ queryKey: ["uds-rekod-label"] });
      queryClient.invalidateQueries({ queryKey: ["uds-laporan"] });
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Gagal menyimpan rekod.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Rekod Label UDS</DialogTitle>
          <DialogDescription>
            Rujukan dijana automatik mengikut tahun. Isi butiran label di bawah.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uds-tarikh">Tarikh</Label>
              <Input id="uds-tarikh" type="date" value={form.Tarikh} onChange={set("Tarikh")} />
            </div>
            <div className="space-y-1.5">
              <Label>Rujukan (Pratonton)</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {preview ?? "—"}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nama Ubat</Label>
            <Combobox
              value={form.NamaUbat || null}
              onValueChange={(v) => {
                const name = typeof v === "string" ? v : null;
                const med = items.find((i) => i.value === name)?.med;
                setUbo(med ?? null);
                setForm((f) => ({
                  ...f,
                  NamaUbat: name ?? "",
                  Kekuatan: med?.Kekuatan ?? f.Kekuatan,
                }));
              }}
            >
              <ComboboxInput />
              <ComboboxContent>
                <ComboboxEmpty>Tiada ubat dijumpai.</ComboboxEmpty>
                <ComboboxList>
                  {items.map((item) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uds-kekuatan">Kekuatan</Label>
              <Input id="uds-kekuatan" value={form.Kekuatan} onChange={set("Kekuatan")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uds-kelompok">Kelompok</Label>
              <Input id="uds-kelompok" value={form.Kelompok} onChange={set("Kelompok")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Luput</Label>
              <Popover>
                <PopoverTrigger
                  render={<Button variant="outline" className="w-full justify-start" />}
                >
                  <CalendarIcon className="size-4" />
                  {form.Luput}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedLuput}
                    onSelect={handleLuputSelect}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uds-kuantiti">Kuantiti</Label>
              <Input
                id="uds-kuantiti"
                type="number"
                min={0}
                value={form.Kuantiti}
                onChange={set("Kuantiti")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uds-penyedia">Penyedia</Label>
            <Input id="uds-penyedia" value={form.Penyedia} onChange={set("Penyedia")} />
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