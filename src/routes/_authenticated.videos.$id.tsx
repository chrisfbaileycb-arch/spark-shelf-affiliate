import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVideoBundle, deleteVideo } from "@/lib/videos.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Copy, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/videos/$id")({
  head: () => ({
    meta: [
      { title: "Video — Echo Your Influence" },
      {
        name: "description",
        content: "Preview, download, and share your AI-generated affiliate video.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VideoDetail,
});

function VideoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const gv = useServerFn(getVideoBundle);
  const dv = useServerFn(deleteVideo);
  const q = useQuery({
    queryKey: ["video", id],
    queryFn: () => gv({ data: { id } }),
    refetchInterval: (data) => {
      const s = data.state.data?.video?.status;
      return s === "ready" || s === "failed" || s === "low_credit" ? false : 3000;
    },
  });

  const delMut = useMutation({
    mutationFn: () => dv({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      navigate({ to: "/videos" });
    },
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!q.data) return <p>Not found</p>;
  const { video } = q.data;
  const isReady = video.status === "ready";
  const hashtags = (video.hashtags ?? []) as string[];

  return (
    <div className="space-y-8">
      <Link
        to="/videos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Videos
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div>
          <Badge
            variant={
              isReady
                ? "default"
                : video.status === "failed" || video.status === "low_credit"
                  ? "destructive"
                  : "secondary"
            }
          >
            {video.status}
          </Badge>
          <h1 className="mt-3 font-display text-4xl leading-tight">
            {video.hook || "Generating…"}
          </h1>
          {video.generation_cost != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Cost: {video.generation_cost} credits
            </p>
          )}
        </div>
        <button
          onClick={() => {
            if (confirm("Delete?")) delMut.mutate();
          }}
          className="text-sm text-destructive hover:underline inline-flex items-center gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </header>

      {video.status === "low_credit" && (
        <Card className="border-destructive bg-destructive/5 p-6">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" /> Video provider unavailable
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{video.error}</p>
        </Card>
      )}

      {video.status === "failed" && (
        <Card className="border-destructive bg-destructive/5 p-6">
          <p className="font-medium text-destructive">Generation failed</p>
          <p className="mt-1 text-sm text-muted-foreground">{video.error || "Unknown error"}</p>
        </Card>
      )}

      {!isReady && video.status !== "failed" && video.status !== "low_credit" && (
        <Card className="p-10 text-center">
          <div className="mx-auto h-2 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/3 animate-pulse bg-primary" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Status: <strong>{video.status}</strong>… polling every 3s. Avatar renders finish in
            30–90s; cinematic b-roll clips can take 1–3 minutes.
          </p>
        </Card>
      )}

      {isReady && (
        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <div className="space-y-3">
            <div className="mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-3xl bg-secondary shadow-pop">
              {video.video_url ? (
                <video
                  src={video.video_url}
                  poster={video.thumbnail_url ?? undefined}
                  controls
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-secondary-foreground/50">
                  No video
                </div>
              )}
            </div>
            {video.video_url && (
              <a
                href={video.video_url}
                download={`reel-${video.id}.mp4`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Download className="h-4 w-4" /> Download MP4
              </a>
            )}
          </div>

          <div className="space-y-4">
            <Card className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hook
              </p>
              <p className="mt-2 font-display text-xl">{video.hook}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Script
              </p>
              <p className="mt-2 leading-relaxed">{video.script}</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Caption
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(video.caption || "");
                    toast.success("Copied");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{video.caption}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {hashtags.map((h) => (
                  <Badge key={h} variant="secondary">
                    #{h}
                  </Badge>
                ))}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(hashtags.map((h) => "#" + h).join(" "));
                  toast.success("Hashtags copied");
                }}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy all hashtags
              </button>
            </Card>

            <Card className="p-6 text-sm text-muted-foreground">
              <p>
                Provider: <strong className="text-foreground">{video.provider || "heygen"}</strong>
              </p>
              {video.heygen_video_id && (
                <p className="mt-1">
                  Task ID: <code className="text-xs">{video.heygen_video_id}</code>
                </p>
              )}
              {video.heygen_avatar_id && (
                <p className="mt-1">
                  Avatar: <code className="text-xs">{video.heygen_avatar_id}</code>
                </p>
              )}
              <p className="mt-1">Duration: {video.duration_seconds ?? 15}s</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
