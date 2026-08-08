// UDS Laporan — daily/monthly/yearly/all with summary cards + breakdowns
"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUdsRekodLabelList } from "@/lib/queries";
import {
  udsAllReport,
  udsDailyReport,
  udsMonthlyReport,
  udsYearlyReport,
  type UdsReportResult,
} from "@/lib/uds-report-data";
import { MALAY_MONTHS } from "@/lib/format";

export default function UdsLaporanPage() {
  const { data: records, isLoading, isError, error } = useUdsRekodLabelList();

  const now = new Date();
  const [date, setDate] = useState(toInputDate(now));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const all = useMemo(() => (records ? udsAllReport(records) : null), [records]);
  const daily = useMemo(
    () => (records ? udsDailyReport(records, date) : null),
    [records, date],
  );
  const monthly = useMemo(
    () => (records ? udsMonthlyReport(records, parseInt(year), parseInt(month)) : null),
    [records, year, month],
  );
  const yearly = useMemo(
    () => (records ? udsYearlyReport(records, parseInt(year)) : null),
    [records, year],
  );

  return (
    <PageShell>
      <h1 className="text-2xl font-semibold mb-6">Laporan UDS</h1>

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm mb-6">
          {error instanceof Error ? error.message : "Gagal memuatkan data."}
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="daily">Harian</TabsTrigger>
            <TabsTrigger value="monthly">Bulanan</TabsTrigger>
            <TabsTrigger value="yearly">Tahunan</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {all && <UdsReportView result={all} />}
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[200px]" />
            {daily && <UdsReportView result={daily} />}
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
                <UdsReportView result={monthly} />
                <UdsBreakdownTable breakdown={monthly.breakdown} />
              </>
            )}
          </TabsContent>

          <TabsContent value="yearly" className="space-y-4">
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
            {yearly && (
              <>
                <UdsReportView result={yearly} />
                <UdsBreakdownTable breakdown={yearly.breakdown} monthLabels />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}

function UdsReportView({ result }: { result: UdsReportResult }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <UdsSummaryCard label="Jumlah Kuantiti" value={result.totalQuantity} />
      <UdsSummaryCard label="Jumlah Rekod" value={result.totalRecords} />
      <UdsSummaryCard label="Ubat Unik" value={result.uniqueMeds} />
      <UdsSummaryCard label="Penyedia Unik" value={result.uniqueStaff} />
    </div>
  );
}

function UdsSummaryCard({ label, value }: { label: string; value: number }) {
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

function UdsBreakdownTable({
  breakdown,
  monthLabels = false,
}: {
  breakdown?: { [key: string]: { totalQuantity: number; totalRecords: number } };
  monthLabels?: boolean;
}) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;
  const keys = Object.keys(breakdown).sort();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{monthLabels ? "Pecahan Bulanan" : "Pecahan Harian"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{monthLabels ? "Bulan" : "Hari"}</TableHead>
              <TableHead className="text-right">Kuantiti</TableHead>
              <TableHead className="text-right">Rekod</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k}>
                <TableCell>
                  {monthLabels ? MALAY_MONTHS[parseInt(k, 10) - 1] : parseInt(k, 10)}
                </TableCell>
                <TableCell className="text-right">{breakdown[k].totalQuantity}</TableCell>
                <TableCell className="text-right">{breakdown[k].totalRecords}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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