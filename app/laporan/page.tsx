// Laporan — daily/monthly/yearly with summary cards + grouped table
"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrabungkusList } from "@/lib/queries";
import { dailyReport, monthlyReport, yearlyReport, type ReportResult } from "@/lib/report-data";
import { MALAY_MONTHS } from "@/lib/format";

export default function LaporanPage() {
  const { data: records, isLoading, isError, error } = usePrabungkusList();

  const now = new Date();
  const [date, setDate] = useState(toInputDate(now));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const daily = useMemo(
    () => (records ? dailyReport(records, date) : null),
    [records, date],
  );
  const monthly = useMemo(
    () => (records ? monthlyReport(records, parseInt(year), parseInt(month)) : null),
    [records, year, month],
  );
  const yearly = useMemo(
    () => (records ? yearlyReport(records, parseInt(year)) : null),
    [records, year],
  );

  return (
    <PageShell>
      <h1 className="text-2xl font-semibold mb-6">Laporan</h1>

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm mb-6">
          {error instanceof Error ? error.message : "Gagal memuatkan data."}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Harian</TabsTrigger>
            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
            <TabsTrigger value="yearly">Tahunan</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[200px]" />
            </div>
            {daily && <ReportView result={daily} />}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={month} onValueChange={(v) => setMonth(v ?? String(now.getMonth() + 1))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {MALAY_MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={(v) => setYear(v ?? String(now.getFullYear()))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions(now.getFullYear()).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {monthly && (
              <>
                <ReportView result={monthly} />
                {monthly.breakdown && (
                  <Card>
                    <CardHeader><CardTitle>Pecahan Harian</CardTitle></CardHeader>
                    <CardContent>
                      <BreakdownTable breakdown={monthly.breakdown} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="yearly" className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={year} onValueChange={(v) => setYear(v ?? String(now.getFullYear()))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions(now.getFullYear()).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {yearly && (
              <>
                <ReportView result={yearly} />
                {yearly.breakdown && (
                  <Card>
                    <CardHeader><CardTitle>Pecahan Bulanan</CardTitle></CardHeader>
                    <CardContent>
                      <BreakdownTable breakdown={yearly.breakdown} monthLabels />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}

function ReportView({ result }: { result: ReportResult }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Kertas Kerja" value={result.totalWorksheet} />
        <SummaryCard label="Jumlah Pek" value={result.totalPekDihasilkan} />
        <SummaryCard label="Jenis Ubat" value={result.uniqueMeds} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Ubat</TableHead>
                <TableHead className="text-right">Kertas Kerja</TableHead>
                <TableHead className="text-right">Jumlah Pek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Tiada rekod.
                  </TableCell>
                </TableRow>
              ) : (
                result.groups.map((g) => (
                  <TableRow key={g.namaUbat}>
                    <TableCell className="font-medium">{g.namaUbat}</TableCell>
                    <TableCell className="text-right">{g.totalWorksheet}</TableCell>
                    <TableCell className="text-right">{g.totalPekDihasilkan}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  breakdown,
  monthLabels = false,
}: {
  breakdown: { [key: string]: { totalWorksheet: number; totalPekDihasilkan: number } };
  monthLabels?: boolean;
}) {
  const keys = Object.keys(breakdown).sort();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{monthLabels ? "Bulan" : "Hari"}</TableHead>
          <TableHead className="text-right">Kertas Kerja</TableHead>
          <TableHead className="text-right">Jumlah Pek</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k}>
            <TableCell>
              {monthLabels ? MALAY_MONTHS[parseInt(k, 10) - 1] : parseInt(k, 10)}
            </TableCell>
            <TableCell className="text-right">{breakdown[k].totalWorksheet}</TableCell>
            <TableCell className="text-right">{breakdown[k].totalPekDihasilkan}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);
  return years;
}