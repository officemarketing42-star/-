import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  eachDayOfInterval,
  parseISO,
  getDay,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
} from "date-fns";
import { th } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateThai(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "d MMM yyyy", { locale: th });
}

export function formatMonthThai(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, "MMMM yyyy", { locale: th });
}

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getSundaysInRange(startDate: string, endDate: string): string[] {
  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });
  return days
    .filter((d) => getDay(d) === 0)
    .map((d) => format(d, "yyyy-MM-dd"));
}

export function getSundaysInMonth(year: number, month: number): string[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  return getSundaysInRange(
    format(start, "yyyy-MM-dd"),
    format(end, "yyyy-MM-dd")
  );
}

export function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function balanceId(
  employeeId: string,
  leaveTypeCode: string,
  year: number,
  month: number
) {
  return `${employeeId}_${leaveTypeCode}_${year}_${String(month).padStart(2, "0")}`;
}

export function exportToCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? "");
          return val.includes(",") ? `"${val}"` : val;
        })
        .join(",")
    ),
  ].join("\n");

  const BOM = "﻿";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildLineCopyText(
  date: string,
  records: { name: string; branchNumber: number; leaveTypeName: string }[]
): string {
  const sorted = [...records].sort((a, b) => a.branchNumber - b.branchNumber);
  const header = `📋 สรุปวันหยุด ${formatDateThai(date)}`;
  const lines = sorted.map(
    (r) => `[${r.branchNumber}] ${r.name} — ${r.leaveTypeName}`
  );
  return [header, ...lines].join("\n");
}
