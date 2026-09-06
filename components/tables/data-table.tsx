// Reusable data table — TanStack Table + shadcn Table
// Handles sorting, global filtering, pagination, column visibility, and expandable detail rows.
"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type Header,
} from "@tanstack/react-table";
import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronRightIcon,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
  initialColumnVisibility?: VisibilityState;
  renderDetailPanel?: (row: TData) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Carian...",
  pageSize = 50,
  initialColumnVisibility = {},
  renderDetailPanel,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility,
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleRow = useCallback((rowId: string) => {
    setExpanded((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  }, []);

  const allColumns = renderDetailPanel
    ? ([
        {
          id: "__expand",
          size: 40,
          minSize: 40,
          maxSize: 40,
          enableSorting: false,
          enableHiding: false,
          header: () => null,
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={expanded[row.id] ? "Tutup butiran" : "Lihat butiran"}
              onClick={() => toggleRow(row.id)}
            >
              <ChevronRightIcon
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  expanded[row.id] && "rotate-90",
                )}
              />
            </Button>
          ),
        },
        ...columns,
      ] as ColumnDef<TData, TValue>[])
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: "includesString",
    initialState: {
      pagination: { pageSize },
    },
  });

  const hideableColumns = table
    .getAllColumns()
    .filter((col) => col.getCanHide());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>

        {hideableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" aria-label="Tunjuk/sembunyi lajur" />
              }
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Lajur</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Tunjuk Lajur</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((column) => {
                  const label =
                    typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id;
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={
                      header.column.id === "__expand"
                        ? { width: 40, minWidth: 40, maxWidth: 40 }
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <SortableHeader header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isExpanded = !!expanded[row.id];
                return (
                  <ExpandableRow
                    key={row.id}
                    row={row}
                    isExpanded={isExpanded}
                    colSpan={allColumns.length}
                    renderDetailPanel={renderDetailPanel}
                  />
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="h-24 text-center"
                >
                  Tiada rekod ditemui.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} rekod
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelum
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Selepas
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpandableRow<TData>({
  row,
  isExpanded,
  colSpan,
  renderDetailPanel,
}: {
  row: import("@tanstack/react-table").Row<TData>;
  isExpanded: boolean;
  colSpan: number;
  renderDetailPanel?: (row: TData) => React.ReactNode;
}) {
  return (
    <>
      <TableRow data-state={row.getIsSelected() && "selected"}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
      {isExpanded && renderDetailPanel && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={colSpan} className="p-4 whitespace-normal break-words">
            {renderDetailPanel(row.original)}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function SortableHeader<TData, TValue>({
  header,
}: {
  header: Header<TData, TValue>;
}) {
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();

  if (!canSort) {
    return flexRender(header.column.columnDef.header, header.getContext());
  }

  const Icon =
    sorted === "asc"
      ? ChevronUp
      : sorted === "desc"
        ? ChevronDown
        : ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={header.column.getToggleSortingHandler()}
      className={cn(
        "-mx-2 flex items-center gap-1 rounded px-2 py-1 text-left font-medium select-none hover:bg-muted",
      )}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <Icon
        className={cn(
          "size-3.5",
          sorted ? "text-primary" : "text-muted-foreground",
        )}
      />
    </button>
  );
}
