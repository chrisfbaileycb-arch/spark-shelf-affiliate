import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  listCalendarSlots,
  createCalendarSlot,
  type CalendarSlot,
} from "@/lib/calendar.functions";
import {
  VIEW_LABEL,
  WEEKDAY_HEADERS,
  daysInRange,
  dayLabel,
  engineLabel,
  isValidISODate,
  parseISODate,
  rangeForView,
  rangeLabel,
  shiftAnchor,
  toISODate,
  type CalendarView,
} from "@/lib/calendar-dates";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react";

const searchSchema = z.object({
  view: fallback(z.string(), "week").default("week"),
  date: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/calendar/")({
  validateSearch: zodValidator(searchSchema),
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Content calendar — Influencer Echo" },
      {
        name: "description",
        content:
          "Plan your posting week, four-week run, or full month. Each day opens its own prompt workspace for scripts, captions, hashtags and disclosure.",
      },
    ],
  }),
});

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();

  const view: CalendarView = (["week", "fourweek", "month"] as const).includes(
    search.view as CalendarView,
  )
    ? (search.view as CalendarView)
    : "week";
  const anchor = isValidISODate(search.date) ? parseISODate(search.date) : new Date();
  const todayISO = toISODate(new Date());

  const { start, end, weeks } = useMemo(() => rangeForView(view, anchor), [view, search.date]);
  const days = useMemo(() => daysInRange(start, end), [start, end]);

  const listFn = useServerFn(listCalendarSlots);
  const createFn = useServerFn(createCalendarSlot);

  const rangeKey = { start: toISODate(start), end: toISODate(end) };
  const slotsQuery = useQuery({
    queryKey: ["calendar-slots", rangeKey.start, rangeKey.end],
    queryFn: () => listFn({ data: rangeKey }),
  });

  const addSlot = useMutation({
    mutationFn: (plan_date: string) => createFn({ data: { plan_date } }),
    onSuccess: (_r, plan_date) => {
      qc.invalidateQueries({ queryKey: ["calendar-slots"] });
      toast.success("Slot added", { description: dayLabel(plan_date) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarSlot[]>();
    for (const s of slotsQuery.data ?? []) {
      const list = map.get(s.plan_date) ?? [];
      list.push(s);
      map.set(s.plan_date, list);
    }
    return map;
  }, [slotsQuery.data]);

  const setView = (v: CalendarView) =>
    navigate({ search: (prev) => ({ ...prev, view: v }) });
  const move = (dir: -1 | 1) =>
    navigate({
      search: (prev) => ({ ...prev, date: toISODate(shiftAnchor(view, anchor, dir)) }),
    });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          Content calendar
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Plan the posting run</h1>
        <p className="max-w-2xl text-muted-foreground">
          Every day owns its own page — engine choice, hook, 15–30s script, video prompt,
          caption, two hashtags and the affiliate disclosure. Posting happens on your phone
          through the share sheet to TikTok, Reels, Shorts or Facebook.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border bg-card p-1" role="tablist">
          {(["week", "fourweek", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              data-testid={`calendar-view-${v}`}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" data-testid="calendar-prev" onClick={() => move(-1)} aria-label="Previous range">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" data-testid="calendar-next" onClick={() => move(1)} aria-label="Next range">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid="calendar-today"
            onClick={() => navigate({ search: (prev) => ({ ...prev, date: todayISO }) })}
          >
            Today
          </Button>
        </div>

        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {rangeLabel(view, anchor)}
        </span>
      </div>

      {slotsQuery.isError && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(slotsQuery.error as Error).message}
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-2 pb-2">
            {WEEKDAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const iso = toISODate(d);
              const slots = byDate.get(iso) ?? [];
              const inMonth = view !== "month" || d.getMonth() === anchor.getMonth();
              return (
                <div
                  key={iso}
                  data-testid={`calendar-day-${iso}`}
                  className={`flex min-h-[112px] flex-col rounded-lg border bg-card p-2 transition-transform hover:-translate-y-0.5 ${
                    inMonth ? "" : "opacity-50"
                  } ${iso === todayISO ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <Link
                      to="/calendar/$date"
                      params={{ date: iso }}
                      className="font-mono text-sm tabular-nums hover:underline"
                    >
                      {d.getDate()}
                    </Link>
                    <button
                      type="button"
                      aria-label={`Add a slot on ${dayLabel(iso)}`}
                      data-testid={`calendar-add-${iso}`}
                      onClick={() => addSlot.mutate(iso)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-1 flex flex-1 flex-col gap-1">
                    {slots.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No posts planned</span>
                    ) : (
                      slots.map((s) => (
                        <Link
                          key={s.id}
                          to="/calendar/$date"
                          params={{ date: iso }}
                          className="truncate rounded bg-muted px-1.5 py-1 text-xs transition-colors hover:bg-muted/70"
                          title={s.title || engineLabel(s.engine)}
                        >
                          <span className="font-mono tabular-nums text-muted-foreground">
                            {s.slot_time}
                          </span>{" "}
                          {s.title || engineLabel(s.engine)}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {weeks} {weeks === 1 ? "week" : "weeks"} of real planned slots. Nothing here is
        sample data.
      </p>
    </div>
  );
}
