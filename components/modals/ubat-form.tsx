// Senarai Ubat — Wizard-style Tambah/Sunting form modal (5 steps + Semakan)
// Follows the same patterns as prabungkus-form.tsx and uds-ubat-form.tsx.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { createUbat, updateUbat } from "@/app/actions/ubat";
import type { UbatRecord } from "@/lib/queries";
import type { UbatInput } from "@/lib/validation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------

interface LookupRow {
  ID: number;
  nama: string;
}
interface LabelRow {
  ID: number;
  deskripsilabel: string;
}
interface WorksheetRow {
  ID: number;
  deskripsiworksheet: string;
}

// ---------- Lookup hook (inline, same pattern as tetapan/page.tsx) ----------

function useUbatLookups() {
  return useQuery({
    queryKey: ["ubat-lookups"],
    queryFn: async () => {
      const supabase = createClient();
      const [kategori, unitSku, unitPku, label, worksheet] = await Promise.all([
        supabase.from("tblkategoriubat").select("ID, nama").order("nama"),
        supabase.from("tblunitsku").select("ID, nama").order("nama"),
        supabase.from("tblunitpku").select("ID, nama").order("nama"),
        supabase.from("tbljenislabel").select("ID, deskripsilabel").order("deskripsilabel"),
        supabase
          .from("tbljenisworksheet")
          .select("ID, deskripsiworksheet")
          .order("deskripsiworksheet"),
      ]);
      return {
        kategori: (kategori.data ?? []) as LookupRow[],
        unitSku: (unitSku.data ?? []) as LookupRow[],
        unitPku: (unitPku.data ?? []) as LookupRow[],
        label: (label.data ?? []) as LabelRow[],
        worksheet: (worksheet.data ?? []) as WorksheetRow[],
      };
    },
  });
}

// ---------- Constants ----------

const EMPTY = {
  namaUbat: "",
  kategoriUbat: "",
  namaDagangan: "",
  deskripsiPrabungkus: "",
  unitSKU: null as string | null,
  unitPKU: null as string | null,
  saizPek: "",
  harga: "",
  pengilang: "",
  nomborMAL: "",
  arahanTambahan: "",
  jangkaHayat: "",
  jenisLabel: null as string | null,
  jenisWorksheet: null as string | null,
};

type FormField = keyof typeof EMPTY;

interface StepDef {
  title: string;
  label: string;
  description: string;
}

const STEPS: StepDef[] = [
  {
    title: "Maklumat Asas",
    label: "Maklumat",
    description:
      "Masukkan nama ubat dan kategori utama. Medan bertanda * wajib diisi.",
  },
  {
    title: "Pembungkusan & Harga",
    label: "Pembung.",
    description:
      "Tetapkan unit stok, unit pek, saiz pek, dan harga prabungkus.",
  },
  {
    title: "Pengilang & Jangka Hayat",
    label: "Pengilang",
    description:
      "Maklumat pengilang, nombor pendaftaran MAL, dan tempoh hayat ubat.",
  },
  {
    title: "Arahan & Templat",
    label: "Arahan",
    description:
      "Arahan tambahan dan pilihan templat label serta worksheet.",
  },
  {
    title: "Semakan",
    label: "Semakan",
    description:
      "Semak semua maklumat sebelum menyimpan. Klik 'Sunting' untuk kembali ke langkah berkaitan.",
  },
];

// ---------- Component ----------

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: UbatRecord | null;
}

export function UbatForm({ open, onOpenChange, editing = null }: Props) {
  const queryClient = useQueryClient();
  const { data: lookups } = useUbatLookups();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set =
    (k: FormField) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // Reset on open — pre-fill when editing, else blank.
  useEffect(() => {
    if (open) {
      setStep(0);
      if (editing) {
        setForm({
          namaUbat: editing.namaUbat ?? "",
          kategoriUbat: editing.kategoriUbat ?? "",
          namaDagangan: editing.namaDagangan ?? "",
          deskripsiPrabungkus: editing.deskripsiPrabungkus ?? "",
          unitSKU: editing.unitSKU ?? null,
          unitPKU: editing.unitPKU ?? null,
          saizPek: editing.saizPek != null ? String(editing.saizPek) : "",
          harga: editing.harga != null ? String(editing.harga) : "",
          pengilang: editing.pengilang ?? "",
          nomborMAL: editing.nomborMAL ?? "",
          arahanTambahan: editing.arahanTambahan ?? "",
          jangkaHayat:
            editing.jangkaHayat != null ? String(editing.jangkaHayat) : "",
          jenisLabel:
            editing.jenisLabel != null ? String(editing.jenisLabel) : null,
          jenisWorksheet:
            editing.jenisWorksheet != null
              ? String(editing.jenisWorksheet)
              : null,
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, editing]);

  // ---------- Navigation ----------

  const handleNext = () => {
    if (step === 0) {
      if (!form.namaUbat.trim()) {
        toast.error("Nama ubat diperlukan.");
        return;
      }
      if (!form.kategoriUbat) {
        toast.error("Kategori diperlukan.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  // ---------- Submit ----------

  const handleSubmit = async () => {
    const payload: UbatInput = {
      namaUbat: form.namaUbat.trim(),
      kategoriUbat: form.kategoriUbat,
      namaDagangan: form.namaDagangan || null,
      deskripsiPrabungkus: form.deskripsiPrabungkus || null,
      unitSKU: form.unitSKU,
      unitPKU: form.unitPKU,
      saizPek: form.saizPek === "" ? null : parseFloat(form.saizPek),
      harga: form.harga === "" ? null : parseFloat(form.harga),
      pengilang: form.pengilang || null,
      nomborMAL: form.nomborMAL || null,
      arahanTambahan: form.arahanTambahan || null,
      jangkaHayat:
        form.jangkaHayat === "" ? null : parseInt(form.jangkaHayat, 10),
      jenisLabel:
        form.jenisLabel == null ? null : parseInt(form.jenisLabel, 10),
      jenisWorksheet:
        form.jenisWorksheet == null ? null : parseInt(form.jenisWorksheet, 10),
    };

    setSaving(true);
    const res = editing
      ? await updateUbat(editing.ID, payload)
      : await createUbat(payload);
    setSaving(false);

    if (res.ok) {
      toast.success(editing ? "Ubat dikemas kini." : "Ubat baharu disimpan.");
      queryClient.invalidateQueries({ queryKey: ["ubat"] });
      onOpenChange(false);
    } else {
      toast.error(res.error ?? "Gagal menyimpan ubat.");
    }
  };

  // ---------- Render helpers ----------

  const findLabel = (id: string) =>
    lookups?.label.find((r) => String(r.ID) === id)?.deskripsilabel ?? null;
  const findWorksheet = (id: string) =>
    lookups?.worksheet.find((r) => String(r.ID) === id)
      ?.deskripsiworksheet ?? null;

  const formatReviewValue = (key: FormField): string => {
    const v = form[key];
    if (v === "" || v == null) return "—";
    switch (key) {
      case "harga":
        return `RM ${parseFloat(v).toFixed(2)}`;
      case "jangkaHayat":
        return `${v} bulan`;
      case "jenisLabel":
        return findLabel(v) ?? "—";
      case "jenisWorksheet":
        return findWorksheet(v) ?? "—";
      default:
        return v;
    }
  };

  // ---------- Step content ----------

  const renderStepContent = () => {
    switch (step) {
      // ---- Step 0: Maklumat Asas ----
      case 0:
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ub-nama">Nama Ubat *</Label>
              <Input
                id="ub-nama"
                placeholder="Contoh: Paracetamol"
                value={form.namaUbat}
                onChange={set("namaUbat")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori *</Label>
              <Select
                value={form.kategoriUbat || null}
                onValueChange={(v) => {
                  if (v !== null)
                    setForm((f) => ({ ...f, kategoriUbat: v }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {(lookups?.kategori ?? []).map((r) => (
                    <SelectItem key={r.ID} value={r.nama}>
                      {r.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ub-dagangan">Nama Dagangan</Label>
              <Input
                id="ub-dagangan"
                placeholder="Contoh: Panadol"
                value={form.namaDagangan}
                onChange={set("namaDagangan")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ub-deskripsi">Deskripsi Prabungkus</Label>
              <Input
                id="ub-deskripsi"
                placeholder="Contoh: 10 tablet per pek"
                value={form.deskripsiPrabungkus}
                onChange={set("deskripsiPrabungkus")}
              />
            </div>
          </div>
        );

      // ---- Step 1: Pembungkusan & Harga ----
      case 1:
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit SKU</Label>
              <Select
                value={form.unitSKU}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, unitSKU: v }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih unit SKU" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— Tiada —</SelectItem>
                  {(lookups?.unitSku ?? []).map((r) => (
                    <SelectItem key={r.ID} value={r.nama}>
                      {r.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit PKU</Label>
              <Select
                value={form.unitPKU}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, unitPKU: v }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih unit PKU" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— Tiada —</SelectItem>
                  {(lookups?.unitPku ?? []).map((r) => (
                    <SelectItem key={r.ID} value={r.nama}>
                      {r.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ub-saiz">Saiz Pek</Label>
              <Input
                id="ub-saiz"
                type="number"
                min={0}
                step="any"
                placeholder="0"
                value={form.saizPek}
                onChange={set("saizPek")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ub-harga">Harga (RM)</Label>
              <Input
                id="ub-harga"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={form.harga}
                onChange={set("harga")}
              />
            </div>
          </div>
        );

      // ---- Step 2: Pengilang & Jangka Hayat ----
      case 2:
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ub-pengilang">Pengilang</Label>
              <Input
                id="ub-pengilang"
                placeholder="Contoh: Pharmaniaga"
                value={form.pengilang}
                onChange={set("pengilang")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ub-mal">Nombor MAL</Label>
              <Input
                id="ub-mal"
                placeholder="Contoh: MAL12345678"
                value={form.nomborMAL}
                onChange={set("nomborMAL")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ub-hayat">Jangka Hayat (bulan)</Label>
              <Input
                id="ub-hayat"
                type="number"
                min={0}
                placeholder="0"
                value={form.jangkaHayat}
                onChange={set("jangkaHayat")}
              />
            </div>
          </div>
        );

      // ---- Step 3: Arahan & Templat ----
      case 3:
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ub-arahan">Arahan Tambahan</Label>
              <Input
                id="ub-arahan"
                placeholder="Contoh: Simpan di tempat sejuk"
                value={form.arahanTambahan}
                onChange={set("arahanTambahan")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jenis Label</Label>
                <Select
                  value={form.jenisLabel}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, jenisLabel: v }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih templat label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>— Tiada —</SelectItem>
                    {(lookups?.label ?? []).map((r) => (
                      <SelectItem key={r.ID} value={String(r.ID)}>
                        {r.deskripsilabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jenis Worksheet</Label>
                <Select
                  value={form.jenisWorksheet}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, jenisWorksheet: v }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih templat worksheet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>— Tiada —</SelectItem>
                    {(lookups?.worksheet ?? []).map((r) => (
                      <SelectItem key={r.ID} value={String(r.ID)}>
                        {r.deskripsiworksheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      // ---- Step 4: Semakan ----
      case 4: {
        const reviewGroups: { title: string; stepIdx: number; fields: { label: string; key: FormField }[] }[] = [
          {
            title: "Maklumat Asas",
            stepIdx: 0,
            fields: [
              { label: "Nama Ubat", key: "namaUbat" },
              { label: "Kategori", key: "kategoriUbat" },
              { label: "Nama Dagangan", key: "namaDagangan" },
              { label: "Deskripsi Prabungkus", key: "deskripsiPrabungkus" },
            ],
          },
          {
            title: "Pembungkusan & Harga",
            stepIdx: 1,
            fields: [
              { label: "Unit SKU", key: "unitSKU" },
              { label: "Unit PKU", key: "unitPKU" },
              { label: "Saiz Pek", key: "saizPek" },
              { label: "Harga", key: "harga" },
            ],
          },
          {
            title: "Pengilang & Jangka Hayat",
            stepIdx: 2,
            fields: [
              { label: "Pengilang", key: "pengilang" },
              { label: "Nombor MAL", key: "nomborMAL" },
              { label: "Jangka Hayat", key: "jangkaHayat" },
            ],
          },
          {
            title: "Arahan & Templat",
            stepIdx: 3,
            fields: [
              { label: "Arahan Tambahan", key: "arahanTambahan" },
              { label: "Jenis Label", key: "jenisLabel" },
              { label: "Jenis Worksheet", key: "jenisWorksheet" },
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
                      key={f.key}
                      label={f.label}
                      value={formatReviewValue(f.key)}
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
            {editing ? "Sunting Ubat" : "Tambah Ubat Baharu"}
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
          {step < 4 ? (
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
      <dd className={cn("font-medium", value === "—" && "text-muted-foreground")}>
        {value}
      </dd>
    </>
  );
}
