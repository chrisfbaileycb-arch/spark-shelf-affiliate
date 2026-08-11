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
      title="Your strategy"
      description="This part is our job. You told us what you're selling — we write the positioning, the campaign angles and the messaging pillars, then push them into the scripts and captions for TikTok, YouTube, Instagram, Facebook, X and Reddit. Change anything you disagree with."
    >
      {({ id, data, refresh }) => <StrategyStep id={id} data={data} refresh={refresh} />}
    </ModuleShell>
  );
}
