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
import { useUdsUbatList, type UdsUbat, type UdsRekodLabel } from "@/lib/queries";
import { createUdsRekodLabel, updateUdsRekodLabel, previewUdsRujukan } from "@/app/actions/uds";
import { todayInKl } from "@/lib/format";

const today = todayInKl;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: UdsRekodLabel | null;
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

export function UdsRekodLabelForm({ open, onOpenChange, editing = null }: Props) {
  const queryClient = useQueryClient();
  const { data: ubatList } = useUdsUbatList();

  const [form, setForm] = useState(EMPTY);
  const [ubo, setUbo] = useState<UdsUbat | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const items = ubatList ?? [];

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Reset on open — pre-fill when editing, else blank.
  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          Tarikh: editing.Tarikh,
          NamaUbat: editing.NamaUbat,
          Kekuatan: editing.Kekuatan ?? "",
          Kelompok: editing.Kelompok,
          Luput: editing.Luput,
          Kuantiti: String(editing.Kuantiti),
          Penyedia: editing.Penyedia,
        });
        setUbo(null);
        setPreview(editing.Rujukan);
      } else {
        setForm(EMPTY);
        setUbo(null);
        setPreview(null);
      }
    }
  }, [open, editing]);

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
    // Store in the accepted expiry grammar: DD/MM/YY.
    setForm((f) => ({ ...f, Luput: format(date, "dd/MM/yy") }));
  };

  const selectedLuput = useMemo(() => {
    if (!/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(form.Luput)) return undefined;
    const d = parse(form.Luput, "dd/MM/yy", new Date());
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
    const payload = {
      Tarikh: form.Tarikh,
      NamaUbat: form.NamaUbat,
      Kekuatan: form.Kekuatan || null,
      Kelompok: form.Kelompok,
      Luput: form.Luput,
      Kuantiti: kuantiti,
      Penyedia: form.Penyedia,
      NamaUbatID: ubo?.ID ?? editing?.NamaUbatID ?? null,
    };
    const res = editing
      ? await updateUdsRekodLabel(editing.ID, payload)
      : await createUdsRekodLabel(payload);
    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Rekod dikemas kini." : `Rekod ${res.data?.Rujukan} disimpan.`);
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
          <DialogTitle>{editing ? "Sunting Rekod Label UDS" : "Tambah Rekod Label UDS"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Rujukan tidak boleh diubah. Kemas kini butiran label di bawah."
              : "Rujukan dijana automatik mengikut tahun. Isi butiran label di bawah."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uds-tarikh">Tarikh</Label>
              <Input id="uds-tarikh" type="date" value={form.Tarikh} onChange={set("Tarikh")} />
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? "Rujukan" : "Rujukan (Pratonton)"}</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {preview ?? "—"}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Nama Ubat</Label>
            <Combobox
              items={items}
              itemToStringLabel={(m) => m.Nama}
              itemToStringValue={(m) => m.Nama}
              value={ubo}
              onValueChange={(m) => {
                setUbo(m);
                setForm((f) => ({
                  ...f,
                  NamaUbat: m?.Nama ?? "",
                  Kekuatan: m?.Kekuatan ?? f.Kekuatan,
                }));
              }}
            >
              <ComboboxInput />
              <ComboboxContent>
                <ComboboxEmpty>Tiada ubat dijumpai.</ComboboxEmpty>
                <ComboboxList>
                  {(m) => (
                    <ComboboxItem key={m.ID} value={m}>
                      {m.Nama}
                      {m.Kekuatan && (
                        <span className="ml-2 text-xs text-muted-foreground">{m.Kekuatan}</span>
                      )}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uds-kekuatan">Kekuatan</Label>
              <Input id="uds-kekuatan" value={form.Kekuatan} readOnly />
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