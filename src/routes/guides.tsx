import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/guides")({
  head: () => ({
    meta: [
      { title: "Affiliate marketing guides for creators — ReelRipper" },
      { name: "description", content: "Step-by-step guides on running an AI-first affiliate marketing operation across TikTok Shop, Amazon Associates, and Reels." },
      { property: "og:title", content: "ReelRipper Guides" },
      { property: "og:description", content: "Playbooks for AI-first affiliate creators." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/guides" },
    ],
    links: [{ rel: "canonical", href: "/guides" }],
  }),
  component: Guides,
});

const GUIDES = [
  { slug: "tiktok-shop-affiliate", title: "The AI-first TikTok Shop affiliate playbook", description: "How to pick winning products, generate 15-second creator videos, and post 5-10 affiliate reels a day without ever going on camera." },
];

function Guides() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-5xl">Guides</h1>
        <p className="mt-3 text-muted-foreground">Playbooks for creators building AI-first affiliate operations.</p>
        <div className="mt-10 space-y-4">
          {GUIDES.map((g) => (
            <Link key={g.slug} to="/guides/$slug" params={{ slug: g.slug }} className="group block rounded-2xl border border-border bg-card p-6 shadow-pop transition hover:border-primary">
              <p className="font-display text-2xl">{g.title}</p>
              <p className="mt-2 text-muted-foreground">{g.description}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Read guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
            </Link>
          ))}
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
