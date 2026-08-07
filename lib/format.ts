// Date formatting helpers (locale-independent dd/mm/yyyy + Malay months)
import { format, parse } from "date-fns";

export const MALAY_MONTHS = [
  "Januari",
  "Februari",
  "Mac",
  "April",
  "Mei",
  "Jun",
  "Julai",
  "Ogos",
  "September",
  "Oktober",
  "November",
  "Disember",
];

export const MALAY_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mac",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ogo",
  "Sep",
  "Okt",
  "Nov",
  "Dis",
];

export const MALAY_DAYS = [
  "Ahad",
  "Isnin",
  "Selasa",
  "Rabu",
  "Khamis",
  "Jumaat",
  "Sabtu",
];

/**
 * Format an ISO 'YYYY-MM-DD' string to 'dd/mm/yyyy'.
 * Explicit ISO parsing → locale-independent.
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  if (isNaN(d.getTime())) return iso;
  return format(d, "dd/MM/yyyy");
}

/**
 * Format an ISO 'YYYY-MM-DD' string to 'dd/mm/yy' (2-digit year).
 */
export function formatDateShort(iso?: string | null): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  if (isNaN(d.getTime())) return iso;
  return format(d, "dd/MM/yy");
}

/**
 * Format a Date to ISO 'YYYY-MM-DD' (local, no timezone shift).
 */
export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Format a year+month to Malay "Januari 2025".
 */
export function formatMonthName(year: number, month: number): string {
  return `${MALAY_MONTHS[month - 1]} ${year}`;
}

/**
 * Format a Date to Malay month name + year.
 */
export function formatMonthLabel(d: Date): string {
  return `${MALAY_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}