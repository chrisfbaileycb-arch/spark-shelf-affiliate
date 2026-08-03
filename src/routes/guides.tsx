import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { GUIDES } from "@/lib/guides.data";

export const Route = createFileRoute("/guides")({
  head: () => ({
    meta: [
      { title: "Affiliate marketing guides for creators — ReelRipper" },
      {
        name: "description",
        content:
          "Step-by-step guides on running an AI-first affiliate marketing operation across TikTok Shop, Amazon Associates, and Reels.",
      },
      { property: "og:title", content: "ReelRipper Guides" },
      { property: "og:description", content: "Playbooks for AI-first affiliate creators." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/guides" },
    ],
    links: [{ rel: "canonical", href: "/guides" }],
  }),
  component: Guides,
});

function Guides() {
  const guide = GUIDES["tiktok-shop-affiliate"];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-5xl">Guides</h1>
        <p className="mt-3 text-muted-foreground">
          Playbooks for creators building AI-first affiliate operations.
        </p>

        <article className="prose prose-neutral mt-12">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Guide</p>
          <h2 className="font-display text-3xl md:text-4xl">{guide.title}</h2>
          <p className="lead text-lg text-muted-foreground">{guide.description}</p>
          {guide.body}
        </article>
      </section>
      <PublicFooter />
    </div>
  );
}
