import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getPublishingQueue,
  recordCaptionCopied,
  recordHandoff,
  recordShareFailure,
  markVariantPosted,
  markVariantSkipped,
  undoPostConfirmation,
  setNotificationPreferences,
  type QueuePost,
  type QueueVariant,
} from "@/lib/publishing.functions";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  CAPABILITY_LABEL,
  HANDOFF_NOTICE,
  PLATFORM_LAUNCH,
  WORKFLOW_LABEL,
  copyCaption,
  deriveWorkflowState,
  detectShareCapability,
  shareVideoToDeviceSheet,
  truthStatusForWorkflow,
  type WorkflowState,
} from "@/lib/social/handoff";
import {
  Bell,
  CalendarDays,
  Check,
  Copy,
  Download,
  ExternalLink,
  Inbox,
  Info,
  Share2,
  SkipForward,
  Undo2,
} from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/publishing")({
  component: PublishingPage,
  head: () => ({
    meta: [
      { title: "Publishing portal — Echo Your Influence" },
      {
        name: "description",
        content:
          "Prepare, schedule, and hand off your campaign videos to your phone's share sheet for TikTok, Reels, Shorts, and LinkedIn.",
      },
    ],
  }),
});

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram Reel",
  youtube: "YouTube Short",
  linkedin: "LinkedIn",
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function PublishingPage() {
  const queueFn = useServerFn(getPublishingQueue);
  const prefsFn = useServerFn(setNotificationPreferences);
  const qc = useQueryClient();
  const capability = useMemo(() => detectShareCapability(), []);

  const { data, isLoading } = useQuery({
    queryKey: ["publishing-queue"],
    queryFn: () => queueFn(),
  });

  const enableReminders = useMutation({
    mutationFn: async () => {
      if (typeof Notification === "undefined") {
        throw new Error("This browser does not support notifications.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/notifications-sw.js");
        } catch {
          /* Notifications still work in-tab without the worker. */
        }
      }
      return prefsFn({ data: { due_reminders_enabled: true, lead_minutes: 10 } });
    },
    onSuccess: () => {
      toast.success("Due reminders enabled for this device.");
      void qc.invalidateQueries({ queryKey: ["publishing-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allVariants = (data?.posts ?? []).flatMap((p) =>
    p.variants.map((v) => ({ ...v, scheduled_at: p.scheduled_at })),
  );
  const metrics = allVariants.reduce(
    (acc, v) => {
      const s = deriveWorkflowState(v);
      acc.prepared += 1;
      if (s === "ready_to_post") acc.due += 1;
      if (s === "handed_off") acc.handed_off += 1;
      if (s === "posted") acc.posted += 1;
      if (s === "skipped") acc.skipped += 1;
      return acc;
    },
    { prepared: 0, due: 0, handed_off: 0, posted: 0, skipped: 0 },
  );

  // In-app due reminder. Fires only while this tab is open; background push
  // (browser closed) stays Staged until real push delivery is configured.
  const notified = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!data?.notificationPreferences.due_reminders_enabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    for (const v of allVariants) {
      if (deriveWorkflowState(v) !== "ready_to_post" || notified.current.has(v.id)) continue;
      notified.current.add(v.id);
      new Notification(
        `Your ${PLATFORM_LABEL[v.platform] ?? v.platform} campaign video is ready to publish!`,
      );
    }
  }, [data, allVariants]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-24">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Execution
        </p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Publishing portal</h1>
        <p className="text-muted-foreground">
          Assets are prepared and scheduled here. You choose the app and confirm the post.
        </p>
      </header>

      <Alert data-testid="handoff-notice">
        <Share2 className="h-4 w-4" />
        <AlertTitle className="text-sm leading-snug">{HANDOFF_NOTICE}</AlertTitle>
        <AlertDescription className="mt-2 text-xs">
          Echo Your Influence does not post to a social network for you and cannot verify a post
          succeeded. Direct API publishing is a future option, not required here.
        </AlertDescription>
      </Alert>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Capability
          </p>
          <p data-testid="share-capability" className="mt-1 text-sm font-medium">
            {CAPABILITY_LABEL[capability]}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Due now
          </p>
          <p className="mt-1 font-mono text-xl tabular-nums">{metrics.due}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Confirmed posted
          </p>
          <p className="mt-1 font-mono text-xl tabular-nums">{metrics.posted}</p>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Bell className="h-4 w-4" /> Due reminders
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data?.backgroundPushConfigured
                ? "Background push is configured."
                : "In-app and on-device reminders while Echo Your Influence is open. Background push (browser closed) is Staged — it needs push delivery keys before we can promise it."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            data-testid="enable-reminders"
            disabled={enableReminders.isPending || data?.notificationPreferences.due_reminders_enabled}
            onClick={() => enableReminders.mutate()}
          >
            {data?.notificationPreferences.due_reminders_enabled ? "Enabled" : "Enable reminders"}
          </Button>
        </div>
        {!data?.backgroundPushConfigured ? (
          <div className="mt-3">
            <StatusBadge status="staged" />
            <span className="ml-2 text-xs text-muted-foreground">
              Remote background push delivery
            </span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data || data.posts.length === 0 ? (
        <div
          data-testid="publishing-empty-state"
          className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"
        >
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-semibold">No posts are scheduled</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When you send a campaign kit to publishing, its platform variants show up here ready
            for hand-off.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/studio">Go to Studio</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.posts.map((post) => (
            <PostCard key={post.id} post={post} capability={capability} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  capability,
}: {
  post: QueuePost;
  capability: ReturnType<typeof detectShareCapability>;
}) {
  return (
    <article
      data-testid={`queue-post-${post.id}`}
      className="space-y-4 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">{post.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {post.scheduled_at
              ? `${new Date(post.scheduled_at).toLocaleString()} · ${post.timezone}`
              : "Not scheduled"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Posted checklist">
          {post.variants.map((v) => {
            const done = Boolean(v.posted_at);
            const skipped = Boolean(v.skipped_at);
            return (
              <span
                key={`chk-${v.id}`}
                data-testid={`checklist-${v.id}`}
                title={
                  done
                    ? "You confirmed this one posted"
                    : skipped
                      ? "Skipped"
                      : "Not confirmed posted yet"
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                  done
                    ? "border-primary bg-primary/10 text-foreground"
                    : skipped
                      ? "text-muted-foreground line-through"
                      : "text-muted-foreground"
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="h-3 w-3 rounded-[3px] border" aria-hidden />
                )}
                {PLATFORM_LABEL[v.platform] ?? v.platform}
              </span>
            );
          })}
        </div>
      </div>


      <ul className="space-y-3" aria-label="Platform checklist">
        {post.variants.map((v) => (
          <VariantCard
            key={v.id}
            variant={v}
            scheduledAt={post.scheduled_at}
            capability={capability}
          />
        ))}
      </ul>
    </article>
  );
}

function VariantCard({
  variant,
  scheduledAt,
  capability,
}: {
  variant: QueueVariant;
  scheduledAt: string | null;
  capability: ReturnType<typeof detectShareCapability>;
}) {
  const qc = useQueryClient();
  const copiedFn = useServerFn(recordCaptionCopied);
  const handoffFn = useServerFn(recordHandoff);
  const failFn = useServerFn(recordShareFailure);
  const postedFn = useServerFn(markVariantPosted);
  const skipFn = useServerFn(markVariantSkipped);
  const undoFn = useServerFn(undoPostConfirmation);

  const [manualCaption, setManualCaption] = useState(false);
  const [postUrl, setPostUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const state: WorkflowState = deriveWorkflowState({ ...variant, scheduled_at: scheduledAt });
  const refresh = () => qc.invalidateQueries({ queryKey: ["publishing-queue"] });
  const proxyUrl = `/api/media/${variant.id}`;

  async function onCopy() {
    const res = await copyCaption(variant.caption);
    if (res.ok) {
      toast.success("Caption copied");
      setManualCaption(false);
      await copiedFn({ data: { variant_id: variant.id } });
      void refresh();
    } else {
      setManualCaption(true);
      toast.error(`${res.reason} Select the caption below and copy it manually.`);
    }
  }

  async function onPostNow() {
    setBusy(true);
    try {
      const outcome = await shareVideoToDeviceSheet({
        mediaUrl: proxyUrl,
        filename: `influencer-echo-${variant.platform}.mp4`,
        title: variant.platform_title ?? "Echo Your Influence",
        text: variant.caption,
        headers: await authHeaders(),
      });

      if (outcome.kind === "handed_off") {
        await handoffFn({ data: { variant_id: variant.id } });
        toast.success("Handed to your device share sheet. Confirm once you've posted.");
        void refresh();
      } else if (outcome.kind === "canceled") {
        // Cancelling is not a hand-off. Nothing is recorded.
        toast("Share canceled — nothing was handed off.");
      } else {
        await failFn({ data: { variant_id: variant.id, reason: outcome.reason } });
        toast.error(outcome.reason);
        void refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDownload() {
    try {
      const res = await fetch(proxyUrl, { headers: await authHeaders() });
      if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `influencer-echo-${variant.platform}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed.");
    }
  }

  const canHandOff = state === "ready_to_post" || state === "handed_off";

  return (
    <li
      data-testid={`variant-${variant.id}`}
      className="rounded-xl border border-border/70 bg-muted/30 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {PLATFORM_LABEL[variant.platform] ?? variant.platform}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {WORKFLOW_LABEL[state]}
          </span>
          <StatusBadge status={truthStatusForWorkflow(state)} />
        </span>
      </div>

      {variant.media_url ? (
        <video
          src={proxyUrl}
          controls
          preload="none"
          poster={undefined}
          className="mt-3 aspect-[9/16] max-h-72 w-full rounded-lg bg-black object-contain"
        />
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No rendered video is attached yet — this variant is not ready to post.
        </p>
      )}

      <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">
        {variant.caption.slice(0, 220)}
        {variant.caption.length > 220 ? "…" : ""}
      </p>

      {manualCaption ? (
        <Textarea
          readOnly
          value={variant.caption}
          data-testid={`manual-caption-${variant.id}`}
          className="mt-2 h-28 select-all font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" onClick={onCopy} data-testid={`copy-caption-${variant.id}`}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy caption
        </Button>
        <Button
          size="sm"
          onClick={onPostNow}
          disabled={!canHandOff || busy || !variant.media_url || capability === "download-only"}
          data-testid={`post-now-${variant.id}`}
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Preparing…" : "Post now"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDownload}
          disabled={!variant.media_url}
          data-testid={`download-${variant.id}`}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download video
        </Button>
        {state === "posted" ? (
          <Button
            size="sm"
            variant="ghost"
            data-testid={`undo-${variant.id}`}
            onClick={async () => {
              await undoFn({ data: { variant_id: variant.id } });
              void refresh();
            }}
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo confirmation
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            data-testid={`skip-${variant.id}`}
            onClick={async () => {
              await skipFn({ data: { variant_id: variant.id } });
              void refresh();
            }}
          >
            <SkipForward className="mr-1.5 h-3.5 w-3.5" /> Skip
          </Button>
        )}
      </div>

      {PLATFORM_LAUNCH[variant.platform] ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full"
          asChild
          data-testid={`open-platform-${variant.id}`}
        >
          <a
            href={PLATFORM_LAUNCH[variant.platform].url}
            target="_blank"
            rel="noreferrer"
            onClick={() => void copyCaption(variant.caption)}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            {PLATFORM_LAUNCH[variant.platform].label}
          </a>
        </Button>
      ) : null}

      {capability === "download-only" ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          This browser has no share sheet. Download the video and the caption, then tap “
          {PLATFORM_LAUNCH[variant.platform]?.label ?? "open the app"}” and upload it there.
        </p>
      ) : (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Copy the caption, hand the video to your share sheet, or jump straight to the platform
          with the button above. Come back and confirm once it’s live.
        </p>
      )}


      {variant.last_share_error ? (
        <p className="mt-2 text-[11px] text-destructive">{variant.last_share_error}</p>
      ) : null}

      {state !== "posted" ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="Post URL (optional)"
            className="h-9 text-xs"
            data-testid={`post-url-${variant.id}`}
          />
          <Button
            size="sm"
            variant="secondary"
            data-testid={`mark-posted-${variant.id}`}
            onClick={async () => {
              await postedFn({
                data: {
                  variant_id: variant.id,
                  external_post_url: postUrl.trim() ? postUrl.trim() : null,
                },
              });
              toast.success("Marked as posted (your confirmation).");
              void refresh();
            }}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" /> Mark as posted
          </Button>
        </div>
      ) : (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          Confirmed by you{variant.posted_at ? ` · ${new Date(variant.posted_at).toLocaleString()}` : ""}
          {variant.external_post_url ? (
            <>
              {" · "}
              <a
                href={variant.external_post_url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                View post
              </a>
            </>
          ) : null}
        </p>
      )}
    </li>
  );
}
