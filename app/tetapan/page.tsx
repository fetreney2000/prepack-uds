// Tetapan — admin settings page (password-gated, Phase 4)
// Categories, units, label/worksheet types, year-scoped running numbers,
// and password change. Matches §4.11 of the analysis.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { TEMPLATE_FIELDS } from "@/lib/docx/template-render";
import {
  createLookup,
  updateLookup,
  deleteLookup,
  updateLabelType,
  deleteLabelType,
  updateWorksheetType,
  deleteWorksheetType,
  updateRunningNumber,
} from "@/app/actions/settings";
import { verifyAdminPassword, changeAdminPassword } from "@/app/actions/auth";
import {
  Lock,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  KeyRound,
  Tag,
  Boxes,
  FileText,
  Hash,
  Download,
  Upload,
} from "lucide-react";

// ---------- Types ----------

interface LookupRow {
  ID: number;
  nama?: string;
  prefix?: string | null;
}

interface TemplateRow {
  ID: number;
  deskripsiLabel?: string;
  deskripsiWorksheet?: string;
  namaFail?: string;
}

type LookupTable = "tblKategoriUbat" | "tblUnitSKU" | "tblUnitPKU";

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
        supabase
          .from("tbljenislabel")
          .select("ID, deskripsiLabel:deskripsilabel, namaFail:namafail")
          .order("ID"),
        supabase
          .from("tbljenisworksheet")
          .select("ID, deskripsiWorksheet:deskripsiworksheet, namaFail:namafail")
          .order("ID"),
      ]);
      return {
        kategori: (kategori.data ?? []) as LookupRow[],
        unitSku: (unitSku.data ?? []) as LookupRow[],
        unitPku: (unitPku.data ?? []) as LookupRow[],
        label: (label.data ?? []) as TemplateRow[],
        worksheet: (worksheet.data ?? []) as TemplateRow[],
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
  const queryClient = useQueryClient();

  const refresh = useCallback(() => {
    refetchLookups();
    queryClient.invalidateQueries({ queryKey: ["tetapan"] });
  }, [refetchLookups, queryClient]);

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
          <TemplateSection
            title="Jenis Label"
            desc="Template label (.docx) — muat turun, sunting di Word, muat naik semula."
            icon={<FileText className="size-4" />}
            rows={lookups?.label}
            loading={!lookups}
            onSaved={refresh}
            kind="label"
          />
          <TemplateSection
            title="Jenis Worksheet"
            desc="Template kertas kerja (.docx) — muat turun, sunting di Word, muat naik semula."
            icon={<FileText className="size-4" />}
            rows={lookups?.worksheet}
            loading={!lookups}
            onSaved={refresh}
            kind="worksheet"
          />
          <RunningNumberCard onSaved={refresh} />
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
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  rows?: LookupRow[];
  loading: boolean;
  columns: string[];
  onSaved: () => void;
  table: LookupTable;
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
    const res = await deleteLookup(table, row.ID);
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

// ---------- Template types (label / worksheet .docx) ----------

function TemplateSection({
  title,
  desc,
  icon,
  rows,
  loading,
  onSaved,
  kind,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  rows?: TemplateRow[];
  loading: boolean;
  onSaved: () => void;
  kind: "label" | "worksheet";
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [descValue, setDescValue] = useState("");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const descKey = kind === "label" ? "deskripsiLabel" : "deskripsiWorksheet";

  const openCreate = () => {
    setEditing(null);
    setDescValue("");
    setCreateFile(null);
    setDialogOpen(true);
  };

  const openEdit = (row: TemplateRow) => {
    setEditing(row);
    setDescValue(String((row as unknown as Record<string, unknown>)[descKey] ?? ""));
    setCreateFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const desc = descValue.trim();
    if (!desc) {
      toast.error("Deskripsi diperlukan.");
      return;
    }

    if (editing) {
      const res =
        kind === "label"
          ? await updateLabelType(editing.ID, { deskripsiLabel: desc })
          : await updateWorksheetType(editing.ID, { deskripsiWorksheet: desc });
      if (res.ok) {
        toast.success("Disimpan.");
        setDialogOpen(false);
        onSaved();
      } else {
        toast.error(res.error ?? "Gagal menyimpan.");
      }
      return;
    }

    if (!createFile) {
      toast.error("Sila pilih fail .docx.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("deskripsi", desc);
      fd.set("file", createFile);
      const resp = await fetch(`/api/template/${kind}`, { method: "POST", body: fd });
      const json = (await resp.json()) as TemplateRouteResponse;
      if (json.ok) {
        toast.success("Jenis baharu dibuat.");
        showTemplateWarning(json.warn);
        setDialogOpen(false);
        onSaved();
      } else {
        toast.error(json.error ?? "Gagal mencipta jenis.");
      }
    } catch {
      toast.error("Gagal mencipta jenis.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: TemplateRow) => {
    const label =
      String((row as unknown as Record<string, unknown>)[descKey] ?? "") || row.namaFail;
    if (!confirm(`Padam '${label}'?`)) return;
    const res =
      kind === "label" ? await deleteLabelType(row.ID) : await deleteWorksheetType(row.ID);
    if (res.ok) {
      toast.success("Dipadam.");
      onSaved();
    } else {
      toast.error(res.error ?? "Gagal memadam.");
    }
  };

  const handleReplace = async (row: TemplateRow, file: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.set("file", file);
      const resp = await fetch(`/api/template/${kind}/${row.ID}`, {
        method: "POST",
        body: fd,
      });
      const json = (await resp.json()) as TemplateRouteResponse;
      if (json.ok) {
        toast.success("Templat diganti.");
        showTemplateWarning(json.warn);
        onSaved();
      } else {
        toast.error(json.error ?? "Gagal menggantikan templat.");
      }
    } catch {
      toast.error("Gagal menggantikan templat.");
    }
  };

  const download = (row: TemplateRow) => {
    const a = document.createElement("a");
    a.href = `/api/template/${kind}/${row.ID}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">
                    {String((row as unknown as Record<string, unknown>)[descKey] ?? "")}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{row.namaFail}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => download(row)}
                    aria-label="Muat turun templat"
                  >
                    <Download className="size-3" />
                  </Button>
                  <ReplaceButton onFile={(f) => handleReplace(row, f)} />
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => openEdit(row)}
                    aria-label="Sunting deskripsi"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleDelete(row)}
                    aria-label="Padam"
                  >
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
        <details className="mt-3 rounded-md border">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-muted-foreground">
            Senarai medan templat ({`{{ variable }}`})
          </summary>
          <div className="max-h-64 overflow-y-auto border-t p-2">
            <TemplateFieldsPanel />
          </div>
        </details>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Sunting ${title}` : `Tambah ${title}`}</DialogTitle>
            <DialogDescription>{desc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Deskripsi</Label>
              <Input
                id="tpl-desc"
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
              />
            </div>
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-file">Fail .docx</Label>
                  <Input
                    id="tpl-file"
                    type="file"
                    accept=".docx"
                    onChange={(e) => setCreateFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Medan tersedia</Label>
                  <p className="text-xs text-muted-foreground">
                    Guna sintaks <code className="rounded bg-muted px-1 text-xs">{`{{ medan }}`}</code> dalam
                    templat. Klik medan untuk salin.
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-md border p-2">
                    <TemplateFieldsPanel />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface TemplateRouteResponse {
  ok?: boolean;
  error?: string;
  warn?: string[];
}

function showTemplateWarning(warn?: string[]) {
  if (warn && warn.length > 0) {
    toast.warning(`Medan tidak dikenali: ${warn.join(", ")}. Semak senarai medan tersedia.`);
  }
}

function TemplateFieldsPanel() {
  const copy = (key: string) => {
    const text = `{{ ${key} }}`;
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${text} disalin.`),
      () => toast.error("Gagal menyalin."),
    );
  };

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {TEMPLATE_FIELDS.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => copy(f.key)}
          title={`${f.label}: ${f.description}`}
          className="flex flex-col items-start gap-0.5 rounded-md border border-border bg-background px-2.5 py-2 text-left text-sm transition-colors hover:border-ring hover:bg-accent"
        >
          <code className="text-xs font-medium text-primary">{`{{ ${f.key} }}`}</code>
          <span className="text-xs text-muted-foreground">
            {f.label} — {f.description}
          </span>
        </button>
      ))}
    </div>
  );
}

function ReplaceButton({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        aria-label="Ganti fail templat"
      >
        <Upload className="size-3" />
      </Button>
    </>
  );
}

function fieldLabel(key: string): string {
  const map: Record<string, string> = {
    nama: "Nama",
    prefix: "Prefix",
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