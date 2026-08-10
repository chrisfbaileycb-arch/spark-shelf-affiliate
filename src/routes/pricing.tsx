import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Image as ImageIcon, Video } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Influencer Echo" },
      {
        name: "description",
        content:
          "Starter Test Pass $29.95/mo for 5 video shorts (15–30s) and 30 fluid ad images, Pro Creator $49 for 15 and 150, Agency $99 for 30 and 500. Cancel anytime.",
      },
      { property: "og:title", content: "Influencer Echo Pricing — Starter, Pro Creator & Agency" },
      {
        property: "og:description",
        content:
          "AI video shorts plus fluid ad images and app/web mockups every month. Cancel anytime.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PublicPricing,
});

function PublicPricing() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <PublicNav />
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="text-center">
          <h1 className="font-display text-5xl md:text-6xl">
            Pricing that scales with your posts.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every plan generates both AI video shorts and a full set of ad images and app/web
            mockups — sized for feed, stories, and landscape.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.priceId}
              data-testid={`plan-${p.tier}`}
              className={`rounded-2xl border p-8 transition-transform hover:-translate-y-1 ${p.highlight ? "border-primary bg-primary/5 shadow-pop" : "border-border bg-card shadow-pop"}`}
            >
              {p.badge && (
                <p className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {p.badge}
                </p>
              )}
              <p className="font-display text-2xl">{p.name}</p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">
                {p.price}
                <span className="font-sans text-base text-muted-foreground">/mo</span>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <Video className="h-4 w-4 text-primary" />
                  <p className="mt-1 font-mono text-xl tabular-nums">{p.videos}</p>
                  <p className="text-xs text-muted-foreground">video shorts / mo</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <p className="mt-1 font-mono text-xl tabular-nums">{p.images}</p>
                  <p className="text-xs text-muted-foreground">images &amp; mockups / mo</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="mt-8 block rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prices in USD. Cancel anytime from your billing page. Rendering costs are included in your
          plan. Video shorts run up to 30 seconds.
        </p>
      </section>
      <PublicFooter />
    </div>
  );
}
