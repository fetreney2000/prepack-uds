// Rekod Prabungkus — Wizard-style Tambah/Sunting form modal (4 steps + Semakan)
// Follows the same patterns as ubat-form.tsx.
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
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUbatList, type UbatRecord, type PrabungkusRecord } from "@/lib/queries";
import {
  createPrabungkus,
  updatePrabungkus,
  previewPrepackId,
} from "@/app/actions/prabungkus";
import type { PrabungkusInput } from "@/lib/validation";
import { todayInKl, formatDate } from "@/lib/format";
import { calculateTarikhLuputBaharu } from "@/lib/biz/luput";
import { calculatePekAndBaki } from "@/lib/biz/pek-baki";

const today = todayInKl;

// ---------- Types ----------

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: PrabungkusRecord | null;
}

// ---------- Constants ----------

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

type FormField = keyof typeof EMPTY;

interface StepDef {
  title: string;
  label: string;
  description: string;
}

const STEPS: StepDef[] = [
  {
    title: "Pilih Ubat & Tarikh",
    label: "Ubat",
    description:
      "Pilih ubat dari senarai dan tetapkan tarikh prabungkus. Medan bertanda * wajib diisi.",
  },
  {
    title: "Kelompok & Luput",
    label: "Kelompok",
    description: "Masukkan nombor kelompok dan tarikh luput asal.",
  },
  {
    title: "Kuantiti & Pek",
    label: "Pek",
    description: "Tetapkan kuantiti, saiz pek, dan harga.",
  },
  {
    title: "Semakan",
    label: "Semakan",
    description:
      "Semak semua maklumat sebelum menyimpan. Klik 'Sunting' untuk kembali ke langkah berkaitan.",
  },
];

// ---------- Component ----------

export function PrabungkusForm({
  open,
  onOpenChange,
  editing = null,
}: Props) {
  const queryClient = useQueryClient();
  const { data: ubatList } = useUbatList();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [ubo, setUbo] = useState<UbatRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const items = useMemo(() => ubatList ?? [], [ubatList]);

  // Look up the medication record when editing (for kategoriUbat, jangkaHayat, etc.)
  const editingUbo = useMemo(() => {
    if (!editing || !items.length) return null;
    return items.find((m) => m.ID === editing.idUbat) ?? null;
  }, [editing, items]);

  // Effective ubat: selected in create mode, looked up in edit mode
  const effectiveUbo = editing ? editingUbo : ubo;

  const set =
    (k: FormField) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // Reset on open — pre-fill when editing, else blank.
  useEffect(() => {
    if (open) {
      setStep(0);
      if (editing) {
        setForm({
          tarikh: editing.tarikh ?? today(),
          nomborKelompok: editing.nomborKelompok ?? "",
          tarikhLuputAsal: editing.tarikhLuputAsal ?? "",
          kuantiti:
            editing.kuantitiUntukDiprabungkus != null
              ? String(editing.kuantitiUntukDiprabungkus)
              : "",
          saizPek:
            editing.saizPek != null ? String(editing.saizPek) : "",
          hargaSetiapPek:
            editing.hargaSetiapPek != null
              ? String(editing.hargaSetiapPek)
              : "",
          deskripsiPek: editing.deskripsiPek ?? "",
          arahanTambahan: editing.arahanTambahan ?? "",
          namaDagangan: editing.namaDagangan ?? "",
        });
        setUbo(null);
        setPreview(editing.idPrabungkus);
      } else {
        setForm(EMPTY);
        setUbo(null);
        setPreview(null);
      }
    }
  }, [open, editing]);

  // ---------- Computed values ----------

  const kuantiti =
    form.kuantiti.trim() === "" ? null : parseInt(form.kuantiti, 10);
  const saizPek =
    form.saizPek.trim() === "" ? null : parseFloat(form.saizPek);
  const hargaSetiapPek =
    form.hargaSetiapPek.trim() === ""
      ? null
      : parseFloat(form.hargaSetiapPek);

  const { jumlahPekDihasilkan, baki } = useMemo(
    () => calculatePekAndBaki(kuantiti, saizPek),
    [kuantiti, saizPek],
  );

  const tarikhLuputBaharu = useMemo(() => {
    return calculateTarikhLuputBaharu(
      effectiveUbo?.jangkaHayat ?? 0,
      form.tarikh,
      form.tarikhLuputAsal || null,
    );
  }, [effectiveUbo, form.tarikh, form.tarikhLuputAsal]);

  // Live ID preview (create mode only)
  useEffect(() => {
    if (editing) return; // skip fetch in edit mode
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
  }, [ubo, form.tarikh, open, editing]);

  // ---------- Navigation ----------

  const handleNext = () => {
    if (step === 0) {
      if (!effectiveUbo) {
        toast.error("Sila pilih ubat dari senarai.");
        return;
      }
      if (!form.tarikh) {
        toast.error("Tarikh diperlukan.");
        return;
      }
    }
    if (step === 2) {
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
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  // ---------- Submit ----------

  const handleSubmit = async () => {
    if (editing && !effectiveUbo) {
      toast.error("Ubat berkaitan tidak dijumpai dalam senarai ubat.");
      return;
    }
    const payload: PrabungkusInput = {
      idUbat: editing ? editing.idUbat : ubo?.ID ?? null,
      namaUbat: editing ? editing.namaUbat : ubo?.namaUbat ?? "",
      kategoriUbat: effectiveUbo?.kategoriUbat ?? "",
      tarikh: form.tarikh,
      namaDagangan: form.namaDagangan || null,
      nomborKelompok: form.nomborKelompok || null,
      tarikhLuputAsal: form.tarikhLuputAsal || null,
      tarikhLuputBaharu,
      pengilang: effectiveUbo?.pengilang ?? null,
      nomborMAL: effectiveUbo?.nomborMAL ?? null,
      kuantitiUntukDiprabungkus: kuantiti,
      saizPek,
      deskripsiPek: form.deskripsiPek || null,
      hargaSetiapPek,
      jumlahPekDihasilkan,
      baki,
      arahanTambahan: form.arahanTambahan || null,
    };

    setSaving(true);
    const res = editing
      ? await updatePrabungkus(editing.ID, payload)
      : await createPrabungkus(payload);
    setSaving(false);

    if (res.ok) {
      toast.success(
        editing
          ? "Rekod dikemas kini."
          : `Rekod ${res.data?.idPrabungkus} disimpan.`,
      );
      queryClient.invalidateQueries({ queryKey: ["prabungkus"] });
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Gagal menyimpan rekod.");
    }
  };

  // ---------- Render helpers ----------

  const displayNamaUbat = editing ? editing.namaUbat : ubo?.namaUbat ?? null;
  const displaykategoriUbat = effectiveUbo?.kategoriUbat ?? null;
  const displayIdPrabungkus = editing ? editing.idPrabungkus : preview;
  const displayNamaDagangan = form.namaDagangan || effectiveUbo?.namaDagangan || null;
  const displayPengilang = effectiveUbo?.pengilang ?? null;
  const displayNomborMAL = effectiveUbo?.nomborMAL ?? null;

  const formatReviewValue = (label: string, value: string | null | undefined): string => {
    if (value == null || value === "") return "—";
    if (label === "Harga / Pek") return `RM ${parseFloat(value).toFixed(2)}`;
    if (
      label === "Tarikh" ||
      label === "Tarikh Luput Asal" ||
      label === "Tarikh Luput Baharu"
    )
      return formatDate(value) || "—";
    return value;
  };

  // ---------- Step content ----------

  const renderStepContent = () => {
    switch (step) {
      // ---- Step 0: Pilih Ubat & Tarikh ----
      case 0:
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp-tarikh">Tarikh *</Label>
                <Input
                  id="pp-tarikh"
                  type="date"
                  value={form.tarikh}
                  onChange={set("tarikh")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>ID Prabungkus</Label>
                <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                  {displayIdPrabungkus ?? "—"}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nama Ubat *</Label>
              {editing ? (
                <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm font-medium">
                  {editing.namaUbat}
                </div>
              ) : (
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
                      saizPek:
                        m?.saizPek != null ? String(m.saizPek) : "",
                      hargaSetiapPek:
                        m?.harga != null ? String(m.harga) : "",
                      deskripsiPek: m?.deskripsiPrabungkus ?? "",
                      arahanTambahan: m?.arahanTambahan ?? "",
                    }));
                  }}
                >
                  <ComboboxInput />
                  <ComboboxContent>
                    <ComboboxEmpty>
                      Tiada ubat dijumpai.
                    </ComboboxEmpty>
                    <ComboboxList>
                      {(m) => (
                        <ComboboxItem key={m.ID} value={m}>
                          {m.namaUbat}
                          {m.namaDagangan && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {m.namaDagangan}
                            </span>
                          )}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                  {displaykategoriUbat ?? "—"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Pengilang</Label>
                <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                  {displayPengilang ?? "—"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nombor MAL</Label>
                <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                  {displayNomborMAL ?? "—"}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pp-nama-dagangan">Nama Dagangan</Label>
              <Input
                id="pp-nama-dagangan"
                value={form.namaDagangan}
                onChange={set("namaDagangan")}
                readOnly={!editing && !!ubo}
              />
            </div>
          </div>
        );

      // ---- Step 1: Kelompok & Luput ----
      case 1:
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp-kelompok">Nombor Kelompok</Label>
                <Input
                  id="pp-kelompok"
                  value={form.nomborKelompok}
                  onChange={set("nomborKelompok")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-luput-asal">Tarikh Luput Asal</Label>
                <Input
                  id="pp-luput-asal"
                  type="date"
                  value={form.tarikhLuputAsal}
                  onChange={set("tarikhLuputAsal")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tarikh Luput Baharu</Label>
              <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                {formatDate(tarikhLuputBaharu) || "—"}
              </div>
            </div>
          </div>
        );

      // ---- Step 2: Kuantiti & Pek ----
      case 2:
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp-kuantiti">Kuantiti</Label>
                <Input
                  id="pp-kuantiti"
                  type="number"
                  min={0}
                  value={form.kuantiti}
                  onChange={set("kuantiti")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-saiz-pek">Saiz Pek</Label>
                <Input
                  id="pp-saiz-pek"
                  type="number"
                  min={0}
                  value={form.saizPek}
                  onChange={set("saizPek")}
                />
              </div>
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label htmlFor="pp-deskripsi">Deskripsi Pek</Label>
                <Input
                  id="pp-deskripsi"
                  value={form.deskripsiPek}
                  onChange={set("deskripsiPek")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jumlah Pek Dihasilkan</Label>
                <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                  {jumlahPekDihasilkan ?? "—"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Baki</Label>
                <div className="flex h-9 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground">
                  {baki ?? "—"}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-arahan">Arahan Tambahan</Label>
              <Input
                id="pp-arahan"
                value={form.arahanTambahan}
                onChange={set("arahanTambahan")}
              />
            </div>
          </div>
        );

      // ---- Step 3: Semakan ----
      case 3: {
        const reviewGroups: {
          title: string;
          stepIdx: number;
          fields: { label: string; value: string | null | undefined }[];
        }[] = [
          {
            title: "Ubat & Tarikh",
            stepIdx: 0,
            fields: [
              { label: "Tarikh", value: form.tarikh },
              { label: "ID Prabungkus", value: displayIdPrabungkus },
              { label: "Nama Ubat", value: displayNamaUbat },
              { label: "Kategori", value: displaykategoriUbat },
              { label: "Nama Dagangan", value: displayNamaDagangan },
              { label: "Pengilang", value: displayPengilang },
              { label: "Nombor MAL", value: displayNomborMAL },
            ],
          },
          {
            title: "Kelompok & Luput",
            stepIdx: 1,
            fields: [
              { label: "Nombor Kelompok", value: form.nomborKelompok },
              { label: "Tarikh Luput Asal", value: form.tarikhLuputAsal },
              { label: "Tarikh Luput Baharu", value: tarikhLuputBaharu },
            ],
          },
          {
            title: "Kuantiti & Pek",
            stepIdx: 2,
            fields: [
              { label: "Kuantiti", value: form.kuantiti },
              { label: "Saiz Pek", value: form.saizPek },
              { label: "Harga / Pek", value: form.hargaSetiapPek },
              {
                label: "Jumlah Pek",
                value:
                  jumlahPekDihasilkan != null
                    ? String(jumlahPekDihasilkan)
                    : null,
              },
              {
                label: "Baki",
                value: baki != null ? String(baki) : null,
              },
              { label: "Deskripsi Pek", value: form.deskripsiPek },
              { label: "Arahan Tambahan", value: form.arahanTambahan },
            ],
          },
        ];

        return (
          <div className="space-y-4">
            {reviewGroups.map((g) => (
              <div key={g.stepIdx}>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {g.title}
                  </h4>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setStep(g.stepIdx)}
                  >
                    Sunting
                  </Button>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
                  {g.fields.map((f) => (
                    <ReviewField
                      key={f.label}
                      label={f.label}
                      value={formatReviewValue(f.label, f.value)}
                    />
                  ))}
                </dl>
              </div>
            ))}
          </div>
        );
      }
    }
  };

  // ---------- Main render ----------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? "Sunting Rekod Prabungkus"
              : "Tambah Rekod Prabungkus"}
          </DialogTitle>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <nav className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={i} className="contents">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium",
                    i < step
                      ? "border-primary bg-primary text-primary-foreground"
                      : i === step
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="size-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    i <= step
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2",
                    i < step ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                />
              )}
            </div>
          ))}
        </nav>

        {/* Step content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Batal
          </Button>
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={saving}
            >
              Kembali
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext}>Seterusnya</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Review field helper ----------

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-medium",
          value === "—" && "text-muted-foreground",
        )}
      >
        {value}
      </dd>
    </>
  );
}
