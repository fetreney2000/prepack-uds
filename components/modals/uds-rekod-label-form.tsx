// UDS Rekod Label — Tambah Rekod form modal
// Wires createUdsRekodLabel (server-generated, year-scoped Rujukan) with a
// live Rujukan preview and a UDS medication combobox.
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
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function UdsRekodLabelForm({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: ubatList } = useUdsUbatList();

  const [form, setForm] = useState(EMPTY);
  const [ubo, setUbo] = useState<UdsUbat | null>(null);
  const [medOpen, setMedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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

  const selectMed = (m: UdsUbat) => {
    setUbo(m);
    setForm((f) => ({
      ...f,
      NamaUbat: m.Nama,
      Kekuatan: m.Kekuatan ?? f.Kekuatan,
    }));
    setMedOpen(false);
  };

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
            <Label htmlFor="uds-ubat">Nama Ubat</Label>
            <div className="flex gap-2">
              <Input
                id="uds-ubat"
                value={form.NamaUbat}
                onChange={set("NamaUbat")}
                placeholder="Nama ubat"
                className="flex-1"
              />
              <Popover open={medOpen} onOpenChange={setMedOpen}>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline" role="combobox" aria-expanded={medOpen}>
                      <ChevronsUpDown className="size-4" />
                    </Button>
                  }
                />
                <PopoverContent className="w-72 p-0">
                  <Command>
                    <CommandInput placeholder="Cari ubat UDS..." />
                    <CommandList>
                      <CommandEmpty>Tiada ubat dijumpai.</CommandEmpty>
                      <CommandGroup>
                        {(ubatList ?? []).map((m) => (
                          <CommandItem
                            key={m.ID}
                            value={m.Nama}
                            onSelect={() => selectMed(m)}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                ubo?.ID === m.ID ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span>{m.Nama}</span>
                            {m.Kekuatan && (
                              <span className="ml-2 text-xs text-muted-foreground">{m.Kekuatan}</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uds-kekuatan">Kekuatan</Label>
              <Input id="uds-kekuatan" value={form.Kekuatan} onChange={set("Kekuatan")} placeholder="cth: 5mg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uds-kelompok">Kelompok</Label>
              <Input id="uds-kelompok" value={form.Kelompok} onChange={set("Kelompok")} placeholder="cth: Batch 1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="uds-luput">Luput</Label>
              <Input id="uds-luput" value={form.Luput} onChange={set("Luput")} placeholder="cth: 12/26" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uds-kuantiti">Kuantiti</Label>
              <Input
                id="uds-kuantiti"
                type="number"
                min={0}
                value={form.Kuantiti}
                onChange={set("Kuantiti")}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="uds-penyedia">Penyedia</Label>
            <Input id="uds-penyedia" value={form.Penyedia} onChange={set("Penyedia")} placeholder="Nama penyedia" />
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