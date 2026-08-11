import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVideos } from "@/lib/videos.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/videos/")({
  head: () => ({
    meta: [
      { title: "Videos — Echo Your Influence" },
      {
        name: "description",
        content:
          "Your library of AI-generated affiliate videos — download, share, or repost to TikTok and Reels.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VideosList,
});

function VideosList() {
  const lv = useServerFn(listVideos);
  const q = useQuery({ queryKey: ["videos"], queryFn: () => lv() });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Library
        </p>
        <h1 className="mt-1 font-display text-4xl">Videos</h1>
      </header>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : q.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {q.data.map((v) => {
            const prod = v.products as { title?: string; source_domain?: string } | null;
            return (
              <Link to="/videos/$id" params={{ id: v.id }} key={v.id} className="group">
                <Card className="overflow-hidden p-0 transition group-hover:-translate-y-1 group-hover:shadow-pop">
                  <div className="aspect-[9/16] bg-secondary">
                    {v.thumbnail_url ? (
                      <img
                        src={v.thumbnail_url}
                        alt={v.hook ? `Video thumbnail: ${v.hook}` : "Video thumbnail"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-secondary-foreground/40">
                        …
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">
                      {v.hook || prod?.title || "Untitled"}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{prod?.source_domain}</span>
                      <Badge
                        variant={
                          v.status === "ready"
                            ? "default"
                            : v.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {v.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
          No videos yet — head to Products and generate your first.
        </Card>
      )}
    </div>
  );
}
