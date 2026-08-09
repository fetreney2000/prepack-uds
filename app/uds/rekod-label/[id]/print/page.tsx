// UDS Label Print page — choose auto (solver) or manual layout, see a
// live PDF preview, then print.
"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Printer, ArrowLeft } from "lucide-react";
import {
  MANUAL_MIN_COLS,
  MANUAL_MAX_COLS,
  MANUAL_MIN_ROWS,
  MANUAL_MAX_ROWS,
  MANUAL_MIN_FONT_SIZE,
  MANUAL_MAX_FONT_SIZE,
  AVAILABLE_FONTS,
  type UdsMode,
} from "@/lib/biz/uds-label-layout";

const FONT_STEP = 0.1;

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-6; v = Math.round((v + step) * 100) / 100) {
    out.push(v);
  }
  return out;
}

const FONT_SIZES = range(MANUAL_MIN_FONT_SIZE, MANUAL_MAX_FONT_SIZE, FONT_STEP);
const ROWS_OPTIONS = range(MANUAL_MIN_ROWS, MANUAL_MAX_ROWS, 1);
const COLS_OPTIONS = range(MANUAL_MIN_COLS, MANUAL_MAX_COLS, 1);

function onChangeString(set: (v: string) => void) {
  return (v: string | null) => set(v ?? "");
}

export default function UdsLabelPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [mode, setMode] = useState<UdsMode>("auto");
  const [font, setFont] = useState<string>(AVAILABLE_FONTS[0]);
  const [fontSize, setFontSize] = useState<string>("5.0");
  const [rows, setRows] = useState<string>("5");
  const [cols, setCols] = useState<string>("5");

  // Build the API URL. The iframe src changes on every option change,
  // which triggers a fresh fetch → live preview.
  const pdfUrl = useMemo(() => {
    const q = new URLSearchParams({ mode });
    if (mode === "manual") {
      q.set("font", font);
      q.set("fontSize", fontSize);
      q.set("rows", rows);
      q.set("cols", cols);
    }
    return `/api/uds/${encodeURIComponent(id)}/label.pdf?${q.toString()}`;
  }, [id, mode, font, fontSize, rows, cols]);

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    } else {
      // Fallback: open the PDF in a new tab.
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <PageShell>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Kembali"
            onClick={() => router.push("/uds/rekod-label")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Cetak Label UDS</h1>
        </div>
        <Button onClick={handlePrint} disabled={!id}>
          <Printer className="h-4 w-4" />
          Cetak
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Options panel */}
        <div className="space-y-5 rounded-lg border bg-card p-4">
          <Tabs
            value={mode}
            onValueChange={(v) => setMode((v as UdsMode) ?? "auto")}
          >
            <Label className="mb-2 block">Mod</Label>
            <TabsList className="w-full">
              <TabsTrigger value="auto" className="flex-1">
                Auto
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="mt-3 text-sm text-muted-foreground">
              <p>
                Susun atur dikira secara automatik oleh penyelesai grid — font,
                saiz fon dan grid optimum dipilih supaya semua teks muat sepenuhnya.
              </p>
            </TabsContent>

            <TabsContent value="manual" className="mt-3 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="font">Font</Label>
              <Select value={font} onValueChange={onChangeString(setFont)}>
                <SelectTrigger id="font" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FONTS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size">Saiz Font (pt)</Label>
              <Select value={fontSize} onValueChange={onChangeString(setFontSize)}>
                <SelectTrigger id="font-size" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZES.map((s) => (
                    <SelectItem key={s} value={s.toFixed(1)}>
                      {s.toFixed(1)} pt
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rows">Baris</Label>
                <Select value={rows} onValueChange={onChangeString(setRows)}>
                  <SelectTrigger id="rows" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROWS_OPTIONS.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cols">Lajur</Label>
                <Select value={cols} onValueChange={onChangeString(setCols)}>
                  <SelectTrigger id="cols" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLS_OPTIONS.map((c) => (
                      <SelectItem key={c} value={String(c)}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live preview */}
        <div>
          <Label className="mb-2 block">Pratonton Langsung</Label>
          <div className="relative overflow-hidden rounded-lg border bg-white">
            {!id ? (
              <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                ID tidak sah.
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                title="Pratonton label UDS"
                src={pdfUrl}
                className="h-[72vh] w-full"
              />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}