import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { getWorkflow } from "@/lib/workflows.functions";
import { MediaPlanBody } from "@/components/campaign/MediaPlanBody";

export const Route = createFileRoute("/_authenticated/media-plan/$id")({
  component: MediaPlanPage,
  head: () => ({
    meta: [
      { title: "Media plan — Echo Your Influence" },
      {
        name: "description",
        content:
          "Per-platform recommendation and a real dollar split of your weekly budget, generated from your own product brief and strategy.",
      },
      { property: "og:title", content: "Media plan — Echo Your Influence" },
      {
        property: "og:description",
        content: "See exactly which platform gets the boost and which run organically.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MediaPlanPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getWorkflow);
  const wf = useQuery({ queryKey: ["workflow", id], queryFn: () => load({ data: { id } }) });

  if (wf.isLoading) return <p className="text-sm text-muted-foreground">Loading campaign…</p>;
  if (wf.error)
    return (
      <Card className="max-w-xl p-6 text-sm">
        <p className="font-medium">This campaign could not be opened.</p>
        <p className="mt-1 text-muted-foreground">{(wf.error as Error).message}</p>
      </Card>
    );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link to="/campaigns/$id" params={{ id }} className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to campaign
        </Link>
        <h1 className="font-display text-3xl font-semibold">Media plan</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Reads your product brief and strategy, then recommends what to run on each platform and
          where your own weekly budget goes. Every dollar figure below comes from the budget you
          enter — nothing is benchmarked or estimated from outside data.
        </p>
      </header>
      <MediaPlanBody
        id={id}
        strategy={wf.data?.strategy}
        refresh={() => qc.invalidateQueries({ queryKey: ["workflow", id] })}
      />
    </div>
  );
}
