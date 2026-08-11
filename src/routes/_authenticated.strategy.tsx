import { createFileRoute } from "@tanstack/react-router";
import { ModuleShell } from "@/components/campaign/ModuleShell";
import { StrategyStep } from "@/components/campaign/steps";

export const Route = createFileRoute("/_authenticated/strategy")({
  component: StrategyPage,
  head: () => ({
    meta: [
      { title: "Strategy — Echo Your Influence" },
      {
        name: "description",
        content:
          "Turn your brief into positioning, audience, campaign angles and objections you can edit before anything is produced.",
      },
      { property: "og:title", content: "Strategy — Echo Your Influence" },
      {
        property: "og:description",
        content: "Positioning, angles and messaging pillars generated from your own brief.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function StrategyPage() {
  return (
    <ModuleShell
      title="Strategy"
      description="Echo reads your brief and proposes who this is for, how to position it, and which angles to run. Edit anything — the words here drive every script later."
    >
      {({ id, data, refresh }) => <StrategyStep id={id} data={data} refresh={refresh} />}
    </ModuleShell>
  );
}
