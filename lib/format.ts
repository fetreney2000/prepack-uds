// Date formatting helpers (locale-independent dd/mm/yyyy + Malay months)
import { format, parse } from "date-fns";

// The system is used in Kuala Lumpur, Malaysia — always resolve wall-clock
// dates in Asia/Kuala_Lumpur (UTC+8) regardless of the runtime/OS timezone.
export const KL_TIME_ZONE = "Asia/Kuala_Lumpur";

/**
 * Current date in Kuala Lumpur as ISO 'YYYY-MM-DD' (local KL wall-clock).
 * Timezone-independent: uses Intl with the explicit KL timezone.
 */
export function todayInKl(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Current year in Kuala Lumpur. Timezone-independent (KL wall-clock).
 */
export function currentYearInKl(): number {
  return Number(todayInKl().slice(0, 4));
}

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