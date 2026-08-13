import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModuleShell } from "@/components/campaign/ModuleShell";
import { ContentStep } from "@/components/campaign/steps";
import { listCalendarSlots } from "@/lib/calendar.functions";
import { addDays, dayLabel, platformLabel, statusLabel, toISODate } from "@/lib/calendar-dates";

export const Route = createFileRoute("/_authenticated/content")({
  component: ContentPage,
  head: () => ({
    meta: [
      { title: "Content by platform — Echo Your Influence" },
      {
        name: "description",
        content:
          "Your week broken out day by day and platform by platform, each with its own script, video hand-off and posting step.",
      },
      { property: "og:title", content: "Content by platform — Echo Your Influence" },
      {
        property: "og:description",
        content: "One lane per platform: script, make the video, then post it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ContentPage() {
  return (
    <ModuleShell
      title="Content by platform"
      description="The hooks, scripts and captions for this campaign, then your calendar broken out day by day — and inside each day, one lane per video platform: TikTok, Instagram Reels, YouTube Shorts and Facebook Reels. Each lane is the same three steps: read its script, make the video, then post it to that account."
    >
      {({ id, data, refresh }) => (
        <div className="space-y-6">
          <ContentStep id={id} data={data} refresh={refresh} />
          <WeekBreakdown />
        </div>
      )}
    </ModuleShell>
  );
}

const WEEK_OPTIONS = [1, 2, 3, 4] as const;

function WeekBreakdown() {
  const list = useServerFn(listCalendarSlots);
  const [weeks, setWeeks] = useState<number>(1);
  const today = new Date();
  const days = Array.from({ length: weeks * 7 }, (_, i) => toISODate(addDays(today, i)));
  const start = days[0]!;
  const end = days[days.length - 1]!;

  const slots = useQuery({
    queryKey: ["calendar-slots", start, end],
    queryFn: () => list({ data: { start, end } }),
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">
            Your next {weeks === 1 ? "week" : `${weeks} weeks`}
          </h2>
          <p className="text-sm text-muted-foreground">
            Plan up to four weeks ahead. Only days you have actually planned appear filled in —
            nothing is invented for you.
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Weeks to plan">
          {WEEK_OPTIONS.map((w) => (
            <Button
              key={w}
              size="sm"
              variant={w === weeks ? "default" : "outline"}
              data-testid={`weeks-${w}`}
              onClick={() => setWeeks(w)}
            >
              {w}w
            </Button>
          ))}
          <Button asChild size="sm" variant="ghost">
            <Link to="/calendar">Full calendar</Link>
          </Button>
        </div>
      </div>

      {slots.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your plan…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {days.map((iso) => {
            const forDay = (slots.data ?? []).filter((s) => s.plan_date === iso);
            return (
              <Card key={iso} className="space-y-3 p-4 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{dayLabel(iso)}</p>
                  <Link
                    to="/calendar/$date"
                    params={{ date: iso }}
                    data-testid={`open-day-${iso}`}
                    className="text-xs underline hover:text-primary"
                  >
                    Open day →
                  </Link>
                </div>
                {forDay.length ? (
                  <ul className="space-y-2">
                    {forDay.map((s) => (
                      <li key={s.id} className="rounded-xl border border-border p-3">
                        <p className="text-sm font-medium">{s.title || "Untitled slot"}</p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {s.slot_time}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.platforms.map((p) => (
                            <Badge key={p} variant="secondary" className="text-[11px]">
                              {platformLabel(p)}
                            </Badge>
                          ))}
                          <Badge variant="outline" className="text-[11px]">
                            {statusLabel(s.status)}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nothing planned yet.{" "}
                    <Link
                      to="/calendar/$date"
                      params={{ date: iso }}
                      className="underline hover:text-primary"
                    >
                      Plan this day
                    </Link>
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
