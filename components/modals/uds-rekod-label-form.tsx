// UDS Rekod Label — Tambah Rekod form modal
// Wires createUdsRekodLabel (server-generated, year-scoped Rujukan) with a
// live Rujukan preview, a shadcn Combobox for the UDS medication, and a
// shadcn date-picker (Popover + Calendar) for the luput field.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { format, startOfYear, endOfYear, addYears } from "date-fns";
import { useUdsUbatList, type UdsUbat, type UdsRekodLabel } from "@/lib/queries";
import { createUdsRekodLabel, updateUdsRekodLabel, previewUdsRujukan } from "@/app/actions/uds";
import { todayInKl } from "@/lib/format";
import { parseLuputToISO } from "@/lib/biz/luput";

const today = todayInKl;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: UdsRekodLabel | null;
}

const EMPTY = {
  Tarikh: "",
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

  // Memoised so its identity is stable across renders. Without this the reset
  // effect below re-fires on every render while the list is loading (`[]` is a
  // fresh array each time) and loops forever on `setForm`.
  const items = useMemo(() => ubatList ?? [], [ubatList]);

  // True once the user has interacted with the medication combobox, so the
  // auto-match effect can never overwrite an explicit choice.
  const userPickedUbo = useRef(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Reset on open — pre-fill when editing, else blank.
  useEffect(() => {
    userPickedUbo.current = false;
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
        setPreview(editing.Rujukan);
      } else {
        // Tarikh is computed here rather than in EMPTY so a tab left open
        // past midnight still defaults to the real today.
        setForm({ ...EMPTY, Tarikh: today() });
        setUbo(null);
        setPreview(null);
      }
    }
  }, [open, editing]);

  // Pre-fill the combobox with the matching medication (by ID, else name).
  // Deliberately separate from the reset effect above: it only touches `ubo`,
  // so a late-loading or refetching medication list can never wipe form state.
  useEffect(() => {
    if (!open || !editing || userPickedUbo.current || items.length === 0) return;
    const matched =
      (editing.NamaUbatID != null
        ? items.find((m) => m.ID === editing.NamaUbatID)
        : undefined) ??
      (editing.NamaUbat
        ? items.find((m) => m.Nama.toUpperCase() === editing.NamaUbat.toUpperCase())
        : undefined) ??
      null;
    setUbo((cur) => cur ?? matched);
  }, [open, editing, items]);

  // Live Rujukan preview from the chosen Tarikh (no reserve).
  // In edit mode the real Rujukan is read-only and must be preserved as-is.
  useEffect(() => {
    let cancelled = false;
    if (!open || editing || !form.Tarikh) {
      if (!editing) setPreview(null);
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
  }, [form.Tarikh, open, editing]);

  const handleLuputSelect = (date?: Date) => {
    if (!date) return;
    // Store in the accepted expiry grammar: DD/MM/YY.
    setForm((f) => ({ ...f, Luput: format(date, "dd/MM/yy") }));
  };

  // Round-trip through the canonical luput grammar so the calendar agrees with
  // every accepted format (MM/YY, MM/YYYY, DD/MM/YY, DD/MM/YYYY), not just
  // dd/MM/yy.
  const selectedLuput = useMemo(() => {
    const iso = parseLuputToISO(form.Luput);
    if (!iso) return undefined;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [form.Luput]);

  // Only link a medication when the visible name still matches it. Editing the
  // name to something else must drop the link, otherwise the server's canonical
  // name override silently reverts the typed text.
  const namaUbatID = useMemo(() => {
    const typed = form.NamaUbat.trim().toUpperCase();
    if (ubo && typed === ubo.Nama.trim().toUpperCase()) return ubo.ID;
    if (editing && typed === editing.NamaUbat.trim().toUpperCase()) return editing.NamaUbatID;
    return null;
  }, [form.NamaUbat, ubo, editing]);

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
      NamaUbatID: namaUbatID,
    };
    const res = editing
      ? await updateUdsRekodLabel(editing.ID, payload)
      : await createUdsRekodLabel(payload);
    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Rekod dikemas kini." : `Rekod ${res.data?.Rujukan} disimpan.`);
      queryClient.invalidateQueries({ queryKey: ["uds-rekod-label"] });
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
                userPickedUbo.current = true;
                setUbo(m);
                setForm((f) => ({
                  ...f,
                  NamaUbat: m?.Nama ?? "",
                  // Kekuatan is derived from the selected medication — clear it
                  // rather than keeping the previous drug's value.
                  Kekuatan: m?.Kekuatan ?? "",
                }));
              }}
              onInputValueChange={(text) => {
                userPickedUbo.current = true;
                setForm((f) => ({ ...f, NamaUbat: text }));
                // Free-typed text is not a selection: drop the link when the
                // input no longer matches the chosen medication.
                setUbo((cur) =>
                  cur && cur.Nama.trim().toUpperCase() === text.trim().toUpperCase()
                    ? cur
                    : null,
                );
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
                  <CalendarIcon className="size-4 text-amber-500" />
                  {form.Luput}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedLuput}
                    onSelect={handleLuputSelect}
                    captionLayout="dropdown"
                    startMonth={startOfYear(addYears(new Date(), -1))}
                    endMonth={endOfYear(addYears(new Date(), 5))}
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