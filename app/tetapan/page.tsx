// Tetapan — admin settings page (password-gated, Phase 4)
// Categories, units, label/worksheet types, color schemes, year-scoped
// running numbers, and password change. Matches §4.11 of the analysis.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  createLookup,
  updateLookup,
  deleteLookup,
  createLabelType,
  updateLabelType,
  deleteLabelType,
  createWorksheetType,
  updateWorksheetType,
  deleteWorksheetType,
  updateRunningNumber,
  setActiveColorScheme,
  createCustomColorScheme,
  deleteCustomColorScheme,
  type ActionResult,
} from "@/app/actions/settings";
import { verifyAdminPassword, changeAdminPassword } from "@/app/actions/auth";
import { BUILT_IN_SCHEMES, findBuiltInScheme, deriveCssVars } from "@/lib/color-schemes";
import { useColorSchemeStore } from "@/stores/color-scheme-store";
import {
  Lock,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  KeyRound,
  Palette,
  Tag,
  Boxes,
  FileText,
  Hash,
} from "lucide-react";

// ---------- Types ----------

interface LookupRow {
  ID: number;
  nama?: string;
  prefix?: string | null;
  deskripsiLabel?: string;
  namafail?: string;
  deskripsiWorksheet?: string;
}

type LookupTable = "tblKategoriUbat" | "tblUnitSKU" | "tblUnitPKU";

interface CustomSchemeRow {
  ID: number;
  schemeId: string;
  name: string;
  colors: string;
  css: string;
}

// ---------- Data fetching ----------

const currentYear = () => new Date().getFullYear();

function useLookups() {
  return useQuery({
    queryKey: ["tetapan-lookups"],
    queryFn: async () => {
      const supabase = createClient();
      const [kategori, unitSku, unitPku, label, worksheet] = await Promise.all([
        supabase.from("tblkategoriubat").select("ID, nama, prefix").order("nama"),
        supabase.from("tblunitsku").select("ID, nama").order("nama"),
        supabase.from("tblunitpku").select("ID, nama").order("nama"),
        supabase.from("tbljenislabel").select("ID, deskripsiLabel, namaFail").order("ID"),
        supabase.from("tbljenisworksheet").select("ID, deskripsiWorksheet, namaFail").order("ID"),
      ]);
      return {
        kategori: (kategori.data ?? []) as LookupRow[],
        unitSku: (unitSku.data ?? []) as LookupRow[],
        unitPku: (unitPku.data ?? []) as LookupRow[],
        label: (label.data ?? []) as LookupRow[],
        worksheet: (worksheet.data ?? []) as LookupRow[],
      };
    },
  });
}

function useColorSchemeData() {
  return useQuery({
    queryKey: ["tetapan-colorschemes"],
    queryFn: async () => {
      const supabase = createClient();
      const [customRes, activeRes] = await Promise.all([
        supabase.from("tblcolorschemes").select("*").order("ID", { ascending: true }),
        supabase
          .from("tblsystemsettings")
          .select("settingvalue")
          .eq("settingkey", "color_scheme")
          .maybeSingle(),
      ]);
      const custom = ((customRes.data ?? []) as CustomSchemeRow[]).map((r) => ({
        ID: r.ID,
        schemeId: r.schemeId,
        name: r.name,
        colors: JSON.parse(r.colors || "[]") as string[],
      }));
      return {
        custom,
        active: (activeRes.data as { settingvalue?: string } | null)?.settingvalue ?? "light",
      };
    },
  });
}

// ---------- Page ----------

export default function TetapanPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { data: lookups, refetch: refetchLookups } = useLookups();
  const { data: schemeData, refetch: refetchSchemes } = useColorSchemeData();
  const queryClient = useQueryClient();

  const applyScheme = useColorSchemeStore((s) => s.applyScheme);

  const refresh = useCallback(() => {
    refetchLookups();
    refetchSchemes();
    queryClient.invalidateQueries({ queryKey: ["tetapan"] });
  }, [refetchLookups, refetchSchemes, queryClient]);

  const handleVerify = async () => {
    const res = await verifyAdminPassword(password);
    if (res.ok) {
      setAuthenticated(true);
      setPasswordOpen(false);
      setPassword("");
      setPasswordError("");
      toast.success("Pengesahan berjaya.");
    } else {
      setPasswordError(res.message ?? "Kata laluan salah.");
    }
  };

  // Auto-open the password prompt on first load.
  useEffect(() => {
    if (!authenticated && !passwordOpen) {
      const t = setTimeout(() => setPasswordOpen(true), 300);
      return () => clearTimeout(t);
    }
  }, [authenticated, passwordOpen]);

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tetapan</h1>
        {authenticated && (
          <Badge variant="secondary">
            <ShieldCheck className="size-3 mr-1" /> Disahkan
          </Badge>
        )}
      </div>

      {!authenticated ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <Lock className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              Tetapan sistem dilindungi kata laluan. Sila sahkan untuk meneruskan.
            </p>
            <Button onClick={() => setPasswordOpen(true)}>
              <Lock className="size-4 mr-1" /> Buka Tetapan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <LookupSection
            title="Kategori Ubat"
            desc="Kategori dengan prefix ID Prabungkus"
            icon={<Tag className="size-4" />}
            rows={lookups?.kategori}
            loading={!lookups}
            columns={["nama", "prefix"]}
            onSaved={refresh}
            table="tblKategoriUbat"
          />
          <LookupSection
            title="Unit SKU"
            desc="Unit stok untuk ubat"
            icon={<Boxes className="size-4" />}
            rows={lookups?.unitSku}
            loading={!lookups}
            columns={["nama"]}
            onSaved={refresh}
            table="tblUnitSKU"
          />
          <LookupSection
            title="Unit PKU"
            desc="Unit pek untuk ubat"
            icon={<Boxes className="size-4" />}
            rows={lookups?.unitPku}
            loading={!lookups}
            columns={["nama"]}
            onSaved={refresh}
            table="tblUnitPKU"
          />
          <LookupSection
            title="Jenis Label"
            desc="Template label (.docx)"
            icon={<FileText className="size-4" />}
            rows={lookups?.label}
            loading={!lookups}
            columns={["deskripsiLabel", "namaFail"]}
            onSaved={refresh}
            kind="label"
          />
          <LookupSection
            title="Jenis Worksheet"
            desc="Template kertas kerja (.docx)"
            icon={<FileText className="size-4" />}
            rows={lookups?.worksheet}
            loading={!lookups}
            columns={["deskripsiWorksheet", "namaFail"]}
            onSaved={refresh}
            kind="worksheet"
          />
          <RunningNumberCard onSaved={refresh} />
          <ColorSchemeCard
            active={schemeData?.active}
            custom={schemeData?.custom}
            loading={!schemeData}
            onSaved={refresh}
            applyScheme={applyScheme}
          />
          <ChangePasswordCard />
        </div>
      )}

      {/* Password gate dialog */}
      <PasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        password={password}
        setPassword={setPassword}
        error={passwordError}
        onVerify={handleVerify}
      />
    </PageShell>
  );
}

// ---------- Password gate ----------

function PasswordDialog({
  open,
  onOpenChange,
  password,
  setPassword,
  error,
  onVerify,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  onVerify: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sahkan Kata Laluan</DialogTitle>
          <DialogDescription>
            Kata laluan diperlukan untuk mengakses Tetapan sistem.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="pw">Kata Laluan</Label>
          <Input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && onVerify()}
            placeholder="Masukkan kata laluan"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onVerify}>
            <ShieldCheck className="size-4 mr-1" /> Sahkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Lookup CRUD ----------

function LookupSection({
  title,
  desc,
  icon,
  rows,
  loading,
  columns,
  onSaved,
  table,
  kind,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  rows?: LookupRow[];
  loading: boolean;
  columns: string[];
  onSaved: () => void;
  table?: LookupTable;
  kind?: "label" | "worksheet";
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LookupRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditing(null);
    const init: Record<string, string> = {};
    for (const c of columns) init[c] = "";
    if (columns.includes("prefix")) init.prefix = "X";
    setForm(init);
    setDialogOpen(true);
  };

  const openEdit = (row: LookupRow) => {
    setEditing(row);
    const init: Record<string, string> = {};
    for (const c of columns) {
      init[c] = String((row as unknown as Record<string, unknown>)[c] ?? "");
    }
    setForm(init);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (kind) {
      const isLabel = kind === "label";
      const payload = {
        [isLabel ? "deskripsiLabel" : "deskripsiWorksheet"]: form[columns[0]],
        namaFail: form[columns[1]],
      };
      const res = editing
        ? isLabel
          ? await updateLabelType(editing.ID, payload as never)
          : await updateWorksheetType(editing.ID, payload as never)
        : isLabel
          ? await createLabelType(payload as never)
          : await createWorksheetType(payload as never);
      if (res.ok) {
        toast.success("Disimpan.");
        setDialogOpen(false);
        onSaved();
      } else {
        toast.error(res.error ?? "Gagal menyimpan.");
      }
      return;
    }

    if (!table) return;
    const payload = { nama: form[columns[0]], prefix: form.prefix ?? null };
    const res = editing
      ? await updateLookup(table, editing.ID, payload)
      : await createLookup(table, payload);
    if (res.ok) {
      toast.success("Disimpan.");
      setDialogOpen(false);
      onSaved();
    } else {
      toast.error(res.error ?? "Gagal menyimpan.");
    }
  };

  const handleDelete = async (row: LookupRow) => {
    if (!confirm(`Padam '${labelOf(row, columns)}'?`)) return;
    let res: ActionResult;
    if (kind === "label") res = await deleteLabelType(row.ID);
    else if (kind === "worksheet") res = await deleteWorksheetType(row.ID);
    else if (table) res = await deleteLookup(table, row.ID);
    else return;
    if (res.ok) {
      toast.success("Dipadam.");
      onSaved();
    } else {
      toast.error(res.error ?? "Gagal memadam.");
    }
  };

  const labelOf = (row: LookupRow, cols: string[]) =>
    String((row as unknown as Record<string, unknown>)[cols[0]] ?? "");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <CardTitle>{title}</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="size-3 mr-1" /> Tambah
          </Button>
        </div>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="divide-y divide-border rounded-md border">
            {(rows ?? []).map((row) => (
              <div key={row.ID} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {columns.map((c) => {
                    const v = (row as unknown as Record<string, unknown>)[c];
                    if (v == null || v === "") return null;
                    return c === "prefix" ? (
                      <Badge key={c} variant="secondary">{String(v)}</Badge>
                    ) : (
                      <span key={c} className="font-medium">{String(v)}</span>
                    );
                  })}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon-xs" variant="ghost" onClick={() => openEdit(row)}>
                    <Pencil className="size-3" />
                  </Button>
                  <Button size="icon-xs" variant="ghost" onClick={() => handleDelete(row)}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {(rows ?? []).length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">Tiada rekod.</p>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Sunting ${title}` : `Tambah ${title}`}</DialogTitle>
            <DialogDescription>{desc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {columns.map((c) => (
              <div key={c} className="space-y-1.5">
                <Label htmlFor={c}>{fieldLabel(c)}</Label>
                <Input
                  id={c}
                  value={form[c] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [c]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function fieldLabel(key: string): string {
  const map: Record<string, string> = {
    nama: "Nama",
    prefix: "Prefix",
    deskripsiLabel: "Deskripsi Label",
    namaFail: "Nama Fail",
    deskripsiWorksheet: "Deskripsi Worksheet",
  };
  return map[key] ?? key;
}

// ---------- Running number ----------

function RunningNumberCard({ onSaved }: { onSaved: () => void }) {
  const [year, setYear] = useState(currentYear());
  const [value, setValue] = useState("1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("tblsystemsettings")
        .select("settingvalue")
        .eq("settingkey", `running_number_${year}`)
        .maybeSingle();
      if (!cancelled) {
        setValue(data?.settingvalue ?? "1");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const handleSave = async () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) {
      toast.error("Nilai mesti integer >= 1.");
      return;
    }
    const res = await updateRunningNumber(year, parsed);
    if (res.ok) {
      toast.success(`Nombor berurutan ${year} disimpan.`);
      onSaved();
    } else {
      toast.error(res.error ?? "Gagal menyimpan.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Hash className="size-4 text-muted-foreground" />
          <CardTitle>Nombor Berurutan</CardTitle>
        </div>
        <CardDescription>Nombor berurutan Prabungkus (setahun).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rn-year">Tahun</Label>
            <Input
              id="rn-year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear())}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rn-value">Nombor Seterusnya</Label>
            <Input
              id="rn-value"
              type="number"
              value={value}
              disabled={loading}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSave}>Simpan</Button>
      </CardContent>
    </Card>
  );
}

// ---------- Color schemes ----------

function ColorSchemeCard({
  active,
  custom,
  loading,
  onSaved,
  applyScheme,
}: {
  active?: string;
  custom?: { ID: number; schemeId: string; name: string; colors: string[] }[];
  loading: boolean;
  onSaved: () => void;
  applyScheme: (vars: Record<string, string>) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [colors, setColors] = useState<string[]>(["", "", "", "", ""]);
  const [saving, setSaving] = useState(false);

  const allSchemes = useMemo(() => {
    const built = BUILT_IN_SCHEMES.map((s) => ({ ID: null, ...s }));
    return [...built, ...(custom ?? [])];
  }, [custom]);

  const handleSelect = async (schemeId: string) => {
    const res = await setActiveColorScheme(schemeId);
    if (res.ok) {
      const built = findBuiltInScheme(schemeId);
      const customScheme = custom?.find((c) => c.schemeId === schemeId);
      if (built) {
        applyScheme(built.css as Record<string, string>);
      } else if (customScheme) {
        applyScheme(deriveCssVars(customScheme.colors));
      }
      toast.success("Skema warna diguna.");
      onSaved();
    } else {
      toast.error(res.error ?? "Gagal set skema.");
    }
  };

  const handleCreate = async () => {
    if (colors.some((c) => !/^#[0-9a-fA-F]{6}$/.test(c))) {
      toast.error("Semua 5 warna mestilah dalam format #RRGGBB.");
      return;
    }
    setSaving(true);
    const res = await createCustomColorScheme({ name, colors });
    setSaving(false);
    if (res.ok) {
      toast.success("Skema warna dibuat.");
      setCreateOpen(false);
      setName("");
      setColors(["", "", "", "", ""]);
      onSaved();
    } else {
      toast.error(res.error ?? "Gagal mencipta skema.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Padam skema warna ini?")) return;
    const res = await deleteCustomColorScheme(id);
    if (res.ok) {
      if (res.data?.resetToLight) {
        applyScheme(BUILT_IN_SCHEMES[0].css);
      }
      toast.success("Skema dipadam.");
      onSaved();
    } else {
      toast.error(res.error ?? "Gagal memadam skema.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-muted-foreground" />
            <CardTitle>Skema Warna</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3 mr-1" /> Skema Baharu
          </Button>
        </div>
        <CardDescription>Pilih skema warna untuk aplikasi.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid gap-2">
            {allSchemes.map((s) => {
              const isActive = s.schemeId === active;
              return (
                <div
                  key={s.ID ?? s.schemeId}
                  className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                    isActive ? "border-ring bg-muted/50" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {(s.colors.length ? s.colors : ["#ccc", "#ccc", "#ccc", "#ccc", "#ccc"]).map(
                        (c, i) => (
                          <span
                            key={i}
                            className="size-4 rounded-full border border-white dark:border-black"
                            style={{ background: c }}
                          />
                        ),
                      )}
                    </div>
                    <span className="font-medium">{s.name}</span>
                    {isActive && <Badge variant="secondary">Aktif</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    {s.ID != null && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDelete(s.ID as number)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    )}
                    {!isActive && (
                      <Button size="sm" variant="outline" onClick={() => handleSelect(s.schemeId)}>
                        Guna
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skema Warna Baharu</DialogTitle>
            <DialogDescription>Masukkan nama dan 5 warna (#RRGGBB).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheme-name">Nama</Label>
              <Input
                id="scheme-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {colors.map((c, i) => (
                <div key={i} className="space-y-1">
                  <Label htmlFor={`color-${i}`} className="text-xs">#{i + 1}</Label>
                  <Input
                    id={`color-${i}`}
                    value={c}
                    onChange={(e) =>
                      setColors((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Menyimpan..." : "Cipta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Change password ----------

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleChange = async () => {
    if (next !== confirm) {
      toast.error("Pengesahan kata laluan tidak sepadan.");
      return;
    }
    const res = await changeAdminPassword(current, next);
    if (res.ok) {
      toast.success(res.message ?? "Kata laluan ditukar.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } else {
      toast.error(res.message ?? "Gagal menukar kata laluan.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <CardTitle>Tukar Kata Laluan</CardTitle>
        </div>
        <CardDescription>Kata laluan baharu minimum 6 aksara.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Kata Laluan Semasa</Label>
          <Input
            id="pw-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-next">Kata Laluan Baharu</Label>
          <Input
            id="pw-next"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-confirm">Sahkan Kata Laluan Baharu</Label>
          <Input
            id="pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button onClick={handleChange}>Tukar Kata Laluan</Button>
      </CardContent>
    </Card>
  );
}