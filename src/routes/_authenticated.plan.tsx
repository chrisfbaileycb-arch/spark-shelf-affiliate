import { createFileRoute } from "@tanstack/react-router";
import { ModuleShell } from "@/components/campaign/ModuleShell";
import { MediaPlanBody } from "@/components/campaign/MediaPlanBody";

export const Route = createFileRoute("/_authenticated/plan")({
  component: PlanPage,
  head: () => ({
    meta: [
      { title: "Budget & channels — Echo Your Influence" },
      {
        name: "description",
        content:
          "See the dollar split of your own weekly budget across TikTok, Reels, Shorts, Facebook and LinkedIn, plus what each channel should run.",
      },
      { property: "og:title", content: "Budget & channels — Echo Your Influence" },
      {
        property: "og:description",
        content: "A real per-platform plan built from the budget you actually have.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PlanPage() {
  return (
    <ModuleShell
      title="Budget & channels"
      description="Enter the budget you actually have this week. Echo recommends which platform takes the paid boost and which run organically — every dollar shown comes from your number, nothing is benchmarked from outside data."
    >
      {({ id, data, refresh }) => (
        <MediaPlanBody id={id} strategy={data.strategy} refresh={refresh} />
      )}
    </ModuleShell>
  );
}
