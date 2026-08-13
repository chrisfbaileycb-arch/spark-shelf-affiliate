// Client-safe date helpers for the content calendar. Local-time only — no UTC
// shifting, because a creator plans posts in the timezone they live in.

export type CalendarView = "week" | "fourweek" | "month";

export const VIEW_LABEL: Record<CalendarView, string> = {
  week: "Week",
  fourweek: "4 weeks",
  month: "Month",
};

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISODate(s);
  return !Number.isNaN(d.getTime()) && toISODate(d) === s;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Monday-first week start. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const dow = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** The inclusive day grid a given view renders, always whole weeks. */
export function rangeForView(view: CalendarView, anchor: Date): { start: Date; end: Date; weeks: number } {
  if (view === "week") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 6), weeks: 1 };
  }
  if (view === "fourweek") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 27), weeks: 4 };
  }
  const start = startOfWeek(startOfMonth(anchor));
  const last = endOfMonth(anchor);
  const end = addDays(startOfWeek(last), 6);
  const weeks = Math.round((end.getTime() - start.getTime()) / (7 * 86400000)) + 1;
  return { start, end, weeks };
}

export function daysInRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) out.push(new Date(d));
  return out;
}

export function shiftAnchor(view: CalendarView, anchor: Date, dir: -1 | 1): Date {
  if (view === "week") return addDays(anchor, 7 * dir);
  if (view === "fourweek") return addDays(anchor, 28 * dir);
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

export function rangeLabel(view: CalendarView, anchor: Date): string {
  const { start, end } = rangeForView(view, anchor);
  if (view === "month") {
    return anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

export function dayLabel(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const ENGINES = [
  { value: "avatar", label: "Avatar video", hint: "HeyGen — spoken narration, burned-in captions" },
  { value: "broll", label: "B-roll video", hint: "MiniMax — silent cinematic motion" },
  { value: "image", label: "Ad image set", hint: "9:16 / 1:1 / 16:9 static creatives" },
] as const;

/** Short-form video surfaces only. LinkedIn is deliberately not here. */
export const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram Reel" },
  { value: "youtube", label: "YouTube Short" },
  { value: "facebook", label: "Facebook Reel" },
] as const;

export const SLOT_STATUS = [
  { value: "planned", label: "Planned" },
  { value: "prompted", label: "Prompt ready" },
  { value: "generated", label: "Asset generated" },
  { value: "queued", label: "In publishing queue" },
  { value: "posted", label: "Posted" },
] as const;

export function statusLabel(value: string): string {
  return SLOT_STATUS.find((s) => s.value === value)?.label ?? value;
}

export function engineLabel(value: string): string {
  return ENGINES.find((e) => e.value === value)?.label ?? value;
}

export function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}
