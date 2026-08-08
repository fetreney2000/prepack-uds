// Dashboard — current month + YTD stat cards + 12-month table
"use client";

import { useMemo } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrabungkusList } from "@/lib/queries";
import { computeDashboard } from "@/lib/dashboard-data";
import { formatMonthName } from "@/lib/format";
import { Package, FileText, Pill } from "lucide-react";

export default function DashboardPage() {
  const { data: records, isLoading, isError, error } = usePrabungkusList();

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const dashboard = useMemo(
    () => (records ? computeDashboard(records, year, month) : null),
    [records, year, month],
  );

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Papan Pemuka</h1>
        {dashboard && (
          <span className="text-sm text-muted-foreground">
            {formatMonthName(year, month)}
          </span>
        )}
      </div>

      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm mb-6">
          {error instanceof Error ? error.message : "Gagal memuatkan data."}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <StatCard
          title={`Jumlah Pek (${dashboard?.monthLabel ?? "..."} / YTD)`}
          value={dashboard ? `${formatNum(dashboard.currentMonth.totalPek)} / ${formatNum(dashboard.ytd.totalPek)}` : null}
          icon={<Package className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title={`Kertas Kerja (${dashboard?.monthLabel ?? "..."} / YTD)`}
          value={dashboard ? `${formatNum(dashboard.currentMonth.totalWorksheet)} / ${formatNum(dashboard.ytd.totalWorksheet)}` : null}
          icon={<FileText className="h-5 w-5" />}
          loading={isLoading}
        />
        <StatCard
          title={`Jenis Ubat (${dashboard?.monthLabel ?? "..."} / YTD)`}
          value={dashboard ? `${formatNum(dashboard.currentMonth.totalJenisUbat)} / ${formatNum(dashboard.ytd.totalJenisUbat)}` : null}
          icon={<Pill className="h-5 w-5" />}
          loading={isLoading}
        />
      </div>

      {/* 12-month table */}
      <Card>
        <CardHeader>
          <CardTitle>Jadual Bulanan {year}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bulan</TableHead>
                <TableHead className="text-right">Jumlah Pek</TableHead>
                <TableHead className="text-right">Kertas Kerja</TableHead>
                <TableHead className="text-right">Jenis Ubat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : dashboard ? (
                dashboard.months.map((m) => (
                  <TableRow key={m.month} className={m.month === month ? "bg-muted/50" : ""}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="text-right">{formatNum(m.totalPek)}</TableCell>
                    <TableCell className="text-right">{formatNum(m.totalWorksheet)}</TableCell>
                    <TableCell className="text-right">{formatNum(m.totalJenisUbat)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Tiada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function StatCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: string | null;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className="text-2xl font-bold">{value ?? "—"}</div>
        )}
      </CardContent>
    </Card>
  );
}

function formatNum(n: number): string {
  return n.toLocaleString("en-US");
}