/** Convert any date-ish value to "YYYY-MM-DD" in local time, or "" */
export function toDateStr(v: string | Date | null | undefined): string {
  if (!v) return "";
  // If already a valid YYYY-MM-DD string, return as-is (avoids UTC reparse shifting the day)
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // For date-only strings (ISO without time), append T12:00:00 to avoid UTC midnight shift
  const d = typeof v === "string" ? new Date(v.length === 10 ? v + "T12:00:00" : v) : v;
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date as "YYYY-MM-DD" */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** Get Monday of current week as "YYYY-MM-DD" */
export function getMondayStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toDateStr(d);
}

/** Get Friday of current week as "YYYY-MM-DD" */
export function getFridayStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 4;
  d.setDate(diff);
  return toDateStr(d);
}

/** Get Sunday of current week as "YYYY-MM-DD" */
export function getSundayStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  return toDateStr(d);
}

/** Add N days to a YYYY-MM-DD string */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Format a YYYY-MM-DD for display */
export function formatDueDate(dateStr: string): string {
  if (!dateStr) return "";
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  if (dateStr === today) return "today";
  if (dateStr === tomorrow) return "tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Returns short day name from "YYYY-MM-DD" */
export function formatShortDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
