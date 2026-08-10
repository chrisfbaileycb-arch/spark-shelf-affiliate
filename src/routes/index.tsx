import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Link2, Video, BadgeDollarSign } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Influencer Echo — AI affiliate videos in one click" },
      {
        name: "description",
        content:
          "Paste any product URL and get a 15-second AI influencer video with voiceover, captions, and a tracked affiliate link — ready to post on TikTok, Reels, and Shorts.",
      },
      { property: "og:title", content: "Influencer Echo — AI affiliate videos in one click" },
      {
        property: "og:description",
        content: "Paste a product URL, get an AI influencer video. Hands-off affiliate marketing.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Influencer Echo",
              description: "AI-generated 15-second influencer videos for affiliate marketing.",
              url: "/",
            },
            {
              "@type": "WebSite",
              name: "Influencer Echo",
              url: "/",
              description:
                "Turn any product URL into a scroll-stopping 15-second AI affiliate video.",
            },
            {
              "@type": "SoftwareApplication",
              name: "Influencer Echo",
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Web",
              offers: [
                { "@type": "Offer", name: "Test the Waters", price: "19.95", priceCurrency: "USD" },
                { "@type": "Offer", name: "Starter", price: "39.95", priceCurrency: "USD" },
                { "@type": "Offer", name: "Pro Scale", price: "69.95", priceCurrency: "USD" },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <PublicNav />

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Hands-off affiliate marketing
            </div>
            <h1 className="mt-6 text-balance font-display text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              Turn any URL into a <span className="text-primary">scroll-stopping</span> multi-format
              ad kit.
            </h1>
            <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
              Paste a product, app store, or website URL. Influencer Echo writes the ad copy, renders
              creatives in every ratio — feed, stories, landscape — mocks apps and sites into real
              device frames, and hands you an AI-avatar short for TikTok, Shorts, and Reels.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop transition hover:opacity-95"
              >
                Start with Starter ($29) <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-surface"
              >
                How it works
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No design work. No on-camera time. No product shipping.
            </p>
          </div>

          <AssetShowcase />

        </div>
      </section>

      <section id="how" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-4xl">Four steps. Done in under a minute.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              {
                i: Link2,
                t: "Paste the URL",
                d: "Amazon, AliExpress, Shopify, or any product URL.",
              },
              {
                i: Sparkles,
                t: "AI ingests it",
                d: "Title, photos, price, hooks, hashtags — all scraped & scripted.",
              },
              {
                i: Video,
                t: "Generate the video",
                d: "AI female voiceover + influencer visuals + animated captions.",
              },
              {
                i: BadgeDollarSign,
                t: "Drop your link",
                d: "We build your tracked affiliate URL. You collect commissions.",
              },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-pop">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.i className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </p>
                <p className="mt-1 font-display text-2xl">{s.t}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="font-display text-4xl">Ready to print affiliate commissions?</h2>
        <p className="mt-3 text-muted-foreground">
          Test the waters with 3 videos for $19.95, or unlock daily posts with Starter. Bring your
          own affiliate IDs from any network.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
        >
          Create your first video <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <PublicFooter />
    </div>
  );
}
