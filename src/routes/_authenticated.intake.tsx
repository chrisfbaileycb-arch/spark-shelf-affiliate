import { createFileRoute } from "@tanstack/react-router";
import { ModuleShell } from "@/components/campaign/ModuleShell";
import { BriefStep } from "@/components/campaign/steps";

export const Route = createFileRoute("/_authenticated/intake")({
  component: IntakePage,
  head: () => ({
    meta: [
      { title: "What you're selling — Echo Your Influence" },
      {
        name: "description",
        content:
          "Paste a product URL or describe your business, and Echo turns it into a working brief that every later step reads from.",
      },
      { property: "og:title", content: "What you're selling — Echo Your Influence" },
      {
        property: "og:description",
        content: "Start a campaign by describing the offer, the audience and the real proof points.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function IntakePage() {
  return (
    <ModuleShell
      title="What are you selling?"
      description="Paste a product page, or type it out in plain language — 'I'm a real estate agent listing a 3-bed in Tempe.' Everything downstream reads from this brief, so only real details go in."
    >
      {({ id, data, refresh }) => <BriefStep id={id} data={data} refresh={refresh} />}
    </ModuleShell>
  );
}
