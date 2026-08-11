import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getDaySlots,
  createCalendarSlot,
  updateCalendarSlot,
  deleteCalendarSlot,
  generateSlotPrompt,
  listCalendarProducts,
  type CalendarSlot,
} from "@/lib/calendar.functions";
import {
  ENGINES,
  PLATFORMS,
  SLOT_STATUS,
  addDays,
  dayLabel,
  isValidISODate,
  parseISODate,
  statusLabel,
  toISODate,
} from "@/lib/calendar-dates";
import { campaignMode } from "@/lib/campaign-modes";

import { PLATFORM_LAUNCH } from "@/lib/social/handoff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";


export const Route = createFileRoute("/_authenticated/calendar/$date")({
  beforeLoad: ({ params }) => {
    if (!isValidISODate(params.date)) throw notFound();
  },
  component: DayPage,
  notFoundComponent: () => (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">That date isn’t valid</h1>
      <Link to="/calendar" className="text-primary underline">
        Back to the calendar
      </Link>
    </div>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `Plan for ${params.date} — Echo Your Influence` },
      {
        name: "description",
        content:
          "One day of your posting plan: engine, hook, script, video prompt, caption, hashtags and affiliate disclosure.",
      },
    ],
  }),
});

function DayPage() {
  const { date } = Route.useParams();
  const qc = useQueryClient();

  const daysFn = useServerFn(getDaySlots);
  const createFn = useServerFn(createCalendarSlot);
  const productsFn = useServerFn(listCalendarProducts);

  const slotsQuery = useQuery({
    queryKey: ["calendar-day", date],
    queryFn: () => daysFn({ data: { date } }),
  });
  const productsQuery = useQuery({
    queryKey: ["calendar-products"],
    queryFn: () => productsFn(),
  });

  const addSlot = useMutation({
    mutationFn: () => createFn({ data: { plan_date: date } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-day", date] });
      qc.invalidateQueries({ queryKey: ["calendar-slots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prev = toISODate(addDays(parseISODate(date), -1));
  const next = toISODate(addDays(parseISODate(date), 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/calendar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Calendar
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" asChild aria-label="Previous day">
            <Link to="/calendar/$date" params={{ date: prev }}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild aria-label="Next day">
            <Link to="/calendar/$date" params={{ date: next }}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{dayLabel(date)}</h1>
        <p className="text-muted-foreground">
          Each slot below is one post. Fill in the product and notes, then generate the prompt
          set for that slot.
        </p>
      </header>

      {slotsQuery.isLoading && <p className="text-muted-foreground">Loading this day…</p>}
      {slotsQuery.isError && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(slotsQuery.error as Error).message}
        </p>
      )}

      {slotsQuery.data?.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Nothing planned for this day yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {(slotsQuery.data ?? []).map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            date={date}
            products={productsQuery.data ?? []}
          />
        ))}
      </div>

      <Button
        data-testid="day-add-slot"
        onClick={() => addSlot.mutate()}
        disabled={addSlot.isPending}
      >
        <Plus className="mr-2 h-4 w-4" />
        {addSlot.isPending ? "Adding…" : "Add a post slot"}
      </Button>
    </div>
  );
}

function SlotCard({
  slot,
  date,
  products,
}: {
  slot: CalendarSlot;
  date: string;
  products: Array<{ id: string; title: string; campaign_mode: string | null }>;
}) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateCalendarSlot);
  const deleteFn = useServerFn(deleteCalendarSlot);
  const generateFn = useServerFn(generateSlotPrompt);

  const [draft, setDraft] = useState(slot);
  useEffect(() => setDraft(slot), [slot]);

  const linkedMode = campaignMode(
    products.find((p) => p.id === draft.product_id)?.campaign_mode ?? "affiliate",
  );
  const affiliate = linkedMode.disclosureRule === "affiliate";


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["calendar-day", date] });
    qc.invalidateQueries({ queryKey: ["calendar-slots"] });
  };

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: slot.id,
          slot_time: draft.slot_time,
          title: draft.title,
          engine: draft.engine as "avatar" | "broll" | "image",
          platforms: draft.platforms as Array<
            "tiktok" | "instagram" | "youtube" | "facebook" | "linkedin"
          >,
          hook: draft.hook,
          script: draft.script,
          video_prompt: draft.video_prompt,
          image_prompt: draft.image_prompt,
          caption: draft.caption,
          hashtags: draft.hashtags,
          disclosure: draft.disclosure,
          notes: draft.notes,
          status: draft.status as "planned" | "prompted" | "generated" | "queued" | "posted",
          product_id: draft.product_id,
        },
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Slot saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { id: slot.id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Slot removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generate = useMutation({
    mutationFn: () => generateFn({ data: { id: slot.id } }),
    onSuccess: (fresh) => {
      setDraft(fresh);
      invalidate();
      toast.success("Prompt set generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePlatform = (value: string) =>
    setDraft((d) => ({
      ...d,
      platforms: d.platforms.includes(value)
        ? d.platforms.filter((p) => p !== value)
        : [...d.platforms, value],
    }));

  const fullCaption = [draft.caption, draft.hashtags.join(" "), draft.disclosure]
    .filter(Boolean)
    .join("\n\n");

  return (
    <section className="rounded-xl border bg-card p-4 md:p-6" data-testid={`slot-${slot.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="time"
          value={draft.slot_time}
          onChange={(e) => setDraft((d) => ({ ...d, slot_time: e.target.value }))}
          className="w-32 font-mono tabular-nums"
          aria-label="Slot time"
          data-testid="slot-time"
        />
        <Input
          value={draft.title}
          placeholder="Slot title (e.g. Morning TikTok)"
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          className="min-w-[200px] flex-1"
          data-testid="slot-title"
        />
        <span className="rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {statusLabel(draft.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Engine</p>
          <div className="flex flex-wrap gap-2">
            {ENGINES.map((e) => (
              <button
                key={e.value}
                type="button"
                title={e.hint}
                data-testid={`slot-engine-${e.value}`}
                onClick={() => setDraft((d) => ({ ...d, engine: e.value }))}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  draft.engine === e.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Platforms
          </p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                data-testid={`slot-platform-${p.value}`}
                onClick={() => togglePlatform(p.value)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  draft.platforms.includes(p.value)
                    ? "border-primary bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Posting is a share-sheet hand-off from your phone — no account connection needed.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Product
          </span>
          <select
            value={draft.product_id ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, product_id: e.target.value || null }))}
            data-testid="slot-product"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">No product linked</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Status
          </span>
          <select
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
            data-testid="slot-status"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {SLOT_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block space-y-1.5 text-sm">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Angle notes for this day
        </span>
        <Textarea
          value={draft.notes}
          rows={2}
          placeholder="What should this post lean on? Season, use case, objection to answer…"
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          data-testid="slot-notes"
        />
      </label>

      <div className="mt-4 rounded-lg border border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Prompt engineering</p>
            <p className="text-xs text-muted-foreground">
              {draft.generated_at
                ? `Generated ${new Date(draft.generated_at).toLocaleString()}${
                    draft.model ? ` · ${draft.model}` : ""
                  }`
                : "Not generated yet — everything below is editable by hand."}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            data-testid="slot-generate"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generate.isPending ? "Writing the prompt set…" : "Generate prompt set"}
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <Field
            label="Hook"
            value={draft.hook}
            rows={2}
            onChange={(v) => setDraft((d) => ({ ...d, hook: v }))}
            testid="slot-hook"
          />
          <Field
            label="Script (15–30s spoken)"
            value={draft.script}
            rows={5}
            onChange={(v) => setDraft((d) => ({ ...d, script: v }))}
            testid="slot-script"
          />
          <Field
            label="Video generation prompt"
            value={draft.video_prompt}
            rows={4}
            onChange={(v) => setDraft((d) => ({ ...d, video_prompt: v }))}
            testid="slot-video-prompt"
          />
          <Field
            label="Image generation prompt"
            value={draft.image_prompt}
            rows={3}
            onChange={(v) => setDraft((d) => ({ ...d, image_prompt: v }))}
            testid="slot-image-prompt"
          />
          <Field
            label="Caption"
            value={draft.caption}
            rows={3}
            onChange={(v) => setDraft((d) => ({ ...d, caption: v }))}
            testid="slot-caption"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Hashtags (2)
              </span>
              <Input
                value={draft.hashtags.join(" ")}
                placeholder="#broadtag #specifictag"
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    hashtags: e.target.value.split(/\s+/).filter(Boolean).slice(0, 6),
                  }))
                }
                data-testid="slot-hashtags"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {affiliate
                  ? "Affiliate disclosure (required)"
                  : `Disclosure — not required for ${linkedMode.label.toLowerCase()}`}
              </span>
              <Input
                value={draft.disclosure}
                placeholder={affiliate ? "#ad — commissionable link" : "Leave blank"}
                onChange={(e) => setDraft((d) => ({ ...d, disclosure: e.target.value }))}
                data-testid="slot-disclosure"
              />
            </label>

          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="slot-save">
          {save.isPending ? "Saving…" : "Save slot"}
        </Button>
        <Button
          variant="outline"
          data-testid="slot-copy"
          onClick={async () => {
            await navigator.clipboard.writeText(fullCaption);
            toast.success("Caption, hashtags and disclosure copied");
          }}
        >
          <Copy className="mr-2 h-4 w-4" /> Copy full caption
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          data-testid="slot-delete"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Remove
        </Button>
      </div>

      {draft.platforms.length > 0 && (
        <div className="mt-6 space-y-3">
          <div>
            <p className="text-sm font-medium">Per-platform hand-off</p>
            <p className="text-xs text-muted-foreground">
              One lane per platform: its own script, its own caption, then the hand-off. Tapping a
              platform copies that lane’s caption and opens the upload screen — nothing posts on its
              own.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {draft.platforms.map((p) => {
              const target = PLATFORM_LAUNCH[p];
              const plan =
                draft.platform_plans.find((x) => x.platform === p) ?? {
                  platform: p,
                  hook: draft.hook,
                  script: draft.script,
                  caption: draft.caption,
                  hashtags: draft.hashtags,
                  format_note: "",
                  posting_tip: "",
                };
              const laneCaption = [plan.caption, plan.hashtags.join(" "), draft.disclosure]
                .filter(Boolean)
                .join("\n\n");

              const patchPlan = (patch: Partial<PlatformPlanRow>) =>
                setDraft((d) => {
                  const exists = d.platform_plans.some((x) => x.platform === p);
                  const plans = exists
                    ? d.platform_plans.map((x) => (x.platform === p ? { ...x, ...patch } : x))
                    : [...d.platform_plans, { ...plan, ...patch }];
                  return { ...d, platform_plans: plans };
                });

              return (
                <div
                  key={p}
                  data-testid={`slot-lane-${p}`}
                  className="rounded-xl border bg-background p-4 transition-transform hover:-translate-y-0.5"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <p className="truncate text-sm font-semibold">{platformLabel(p)}</p>
                    <span className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {plan.script ? "Script ready" : "No script yet"}
                    </span>
                  </div>

                  {plan.format_note && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                      {plan.format_note}
                    </p>
                  )}

                  <label className="mt-3 block space-y-1 text-sm">
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Script for {platformLabel(p)}
                    </span>
                    <Textarea
                      rows={4}
                      value={plan.script}
                      onChange={(e) => patchPlan({ script: e.target.value })}
                      data-testid={`slot-lane-script-${p}`}
                    />
                  </label>

                  <label className="mt-3 block space-y-1 text-sm">
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Caption
                    </span>
                    <Textarea
                      rows={2}
                      value={plan.caption}
                      onChange={(e) => patchPlan({ caption: e.target.value })}
                      data-testid={`slot-lane-caption-${p}`}
                    />
                  </label>

                  <label className="mt-3 block space-y-1 text-sm">
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                      Hashtags
                    </span>
                    <Input
                      value={plan.hashtags.join(" ")}
                      placeholder="#broadtag #specifictag"
                      onChange={(e) =>
                        patchPlan({
                          hashtags: e.target.value.split(/\s+/).filter(Boolean).slice(0, 6),
                        })
                      }
                      data-testid={`slot-lane-hashtags-${p}`}
                    />
                  </label>

                  {plan.posting_tip && (
                    <p className="mt-3 text-xs text-muted-foreground">{plan.posting_tip}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`slot-lane-copy-${p}`}
                      onClick={async () => {
                        await navigator.clipboard.writeText(laneCaption);
                        toast.success(`${platformLabel(p)} caption copied`);
                      }}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy caption
                    </Button>
                    {target && (
                      <Button size="sm" asChild data-testid={`slot-open-${p}`}>
                        <a
                          href={target.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            void navigator.clipboard.writeText(laneCaption);
                            toast.success("Caption copied — paste it after you upload");
                          }}
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Open {target.label}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </section>
  );
}

function Field({
  label,
  value,
  rows,
  onChange,
  testid,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (v: string) => void;
  testid: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} />
    </label>
  );
}
