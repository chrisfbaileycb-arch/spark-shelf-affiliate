import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublishingQueue, type QueuePost } from "@/lib/publishing.functions";
import { StatusBadge } from "@/components/StatusBadge";
import { DRY_RUN_NOTICE } from "@/lib/integrations/status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CalendarDays, Inbox, TriangleAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/publishing")({
  component: PublishingPage,
  head: () => ({
    meta: [
      { title: "Publishing queue — Influencer Echo" },
      {
        name: "description",
        content:
          "Review, approve, and schedule your campaign posts across TikTok, Reels, and Shorts from one queue.",
      },
    ],
  }),
});

const STATE_LABEL: Record<string, string> = {
  draft: "Draft",
  awaiting_approval: "Awaiting approval",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  canceled: "Canceled",
};

function PublishingPage() {
  const queueFn = useServerFn(getPublishingQueue);
  const { data, isLoading } = useQuery({
    queryKey: ["publishing-queue"],
    queryFn: () => queueFn(),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Execution
        </p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Publishing queue</h1>
        <p className="max-w-2xl text-muted-foreground">
          Every post moves through draft, approval, and scheduling before it leaves. Human approval
          is required by default.
        </p>
      </header>

      {data && !data.liveExecutionEnabled ? (
        <Alert data-testid="publishing-dry-run-notice">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{DRY_RUN_NOTICE}</AlertTitle>
          <AlertDescription>
            Posting actions are disabled until the social provider is configured and you complete a
            successful test post.{" "}
            <Link
              to="/settings/integrations"
              className="underline underline-offset-4"
            >
              Open integrations
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

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
            When you send a campaign kit to publishing, its platform variants show up here as
            drafts waiting on your approval.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/studio">Go to Studio</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostRow({ post }: { post: QueuePost }) {
  return (
    <article
      data-testid={`queue-post-${post.id}`}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{post.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {post.scheduled_at
              ? `${new Date(post.scheduled_at).toLocaleString()} · ${post.timezone}`
              : "Not scheduled"}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 font-mono text-[11px] uppercase tracking-wide">
          {STATE_LABEL[post.state] ?? post.state}
        </span>
      </div>

      {post.variants.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {post.variants.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="font-medium capitalize">{v.platform}</span>
              <span className="flex items-center gap-3">
                {v.last_error ? (
                  <span className="max-w-xs truncate text-xs text-destructive">{v.last_error}</span>
                ) : null}
                <StatusBadge
                  status={
                    v.state === "published"
                      ? "working"
                      : v.state === "failed"
                        ? "failed"
                        : v.state === "scheduled"
                          ? "scheduled"
                          : "staged"
                  }
                />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
