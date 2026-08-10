import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Link2, Video, BadgeDollarSign } from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { AssetShowcase } from "@/components/AssetShowcase";
import { INDUSTRIES } from "@/lib/industries";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Influencer Echo — AI ad kits & video shorts from any URL" },
      {
        name: "description",
        content:
          "Paste any product, app, or website URL. Get 15–30s vertical AI video shorts plus fluid 1:1, 9:16, and 16:9 ad image kits for TikTok, Instagram, and Facebook.",
      },
      { property: "og:title", content: "Influencer Echo — AI ad kits & video shorts from any URL" },
      {
        property: "og:description",
        content: "One URL in. Multi-ratio ad cards and AI video shorts out — for every industry.",
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
                { "@type": "Offer", name: "Starter", price: "29.95", priceCurrency: "USD" },
                { "@type": "Offer", name: "Pro Creator", price: "49.00", priceCurrency: "USD" },
                { "@type": "Offer", name: "Agency", price: "99.00", priceCurrency: "USD" },
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
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> AI video shorts &amp; fluid ad
              studio
            </div>
            <h1 className="mt-6 text-balance font-display text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              Turn any link into <span className="text-primary">scroll-stopping</span> ads &amp;
              video shorts.
            </h1>
            <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
              Paste any product, app, or website URL. Influencer Echo writes the hook, renders 15–30
              second vertical video shorts, and builds complete multi-ratio ad image kits for
              TikTok, Instagram, and Facebook.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/pricing"
                data-testid="hero-start-test-pass"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop transition hover:opacity-95"
              >
                Start Test Pass ($29.95) <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/industries"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-surface"
              >
                Browse industries
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No video editing. No camera time. Fluid 1:1, 9:16, and 16:9 ad sets included.
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

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Vertical solution matrix
            </p>
            <h2 className="mt-2 font-display text-4xl">Built for your industry, not a template.</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Every vertical gets its own hook angle, ad-card layouts, and short-form script
              structure — from listing tours to menu promos.
            </p>
          </div>
          <Link
            to="/industries"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:bg-surface"
          >
            See all industries <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <Link
              key={ind.slug}
              to="/industries"
              data-testid={`home-industry-${ind.slug}`}
              className="group rounded-3xl border border-border bg-card p-6 shadow-pop transition-transform hover:-translate-y-1"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ind.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-xl">{ind.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ind.headline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="font-display text-4xl">Ready to fill every surface?</h2>
        <p className="mt-3 text-muted-foreground">
          Start the Test Pass at $29.95/mo for 5 video shorts and 30 fluid ad images, or scale to
          Pro Creator ($49) and Agency ($99).
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
