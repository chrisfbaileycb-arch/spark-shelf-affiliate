import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Link2,
  Video,
  BadgeDollarSign,
  Home,
  MonitorSmartphone,
  ShoppingBag,
  Wrench,
  UtensilsCrossed,
  Scale,
  Play,
  Zap,
  LayoutGrid,
  Image as ImageIcon,
} from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { BrandMark } from "@/components/BrandMark";
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

// Feature card definitions (kept local to the landing route).
const FEATURES = [
  {
    icon: Video,
    accent: "hl-pink",
    glow: "hl-pink",
    title: "Video Shorts",
    body: "15–30s vertical 9:16 with AI voiceover, influencer visuals, and animated captions — ready for TikTok & Reels.",
    meta: "9:16 · AI VO · captions",
  },
  {
    icon: ImageIcon,
    accent: "hl-green",
    glow: "hl-green",
    title: "Ad Image Kits",
    body: "Fluid 1:1, 9:16, and 16:9 ad cards generated from the same source — headline, product cutout, price callout, all on-brand.",
    meta: "1:1 · 9:16 · 16:9",
  },
  {
    icon: BadgeDollarSign,
    accent: "hl-blue",
    glow: "hl-blue",
    title: "Affiliate Links",
    body: "We auto-detect the affiliate program, build your tracked URL, and hand you the commission path — drop it in your bio and post.",
    meta: "UTM · tracked · auto-paid",
  },
  {
    icon: Zap,
    accent: "bg-gradient-brand text-primary-foreground",
    glow: "hl-orange",
    title: "Studio Workflow",
    body: "Queue multiple URLs, batch-generate, and keep every brand consistent. Pro & Agency tiers unlock bulk rendering.",
    meta: "bulk · queue · brands",
  },
] as const;

// How-it-works steps (carried over from the original).
const STEPS = [
  { icon: Link2, accent: "hl-pink", title: "Paste the URL", body: "Amazon, AliExpress, Shopify, or any product URL — one-click, no config." },
  { icon: Sparkles, accent: "hl-green", title: "AI ingests it", body: "Title, photos, price, hooks, hashtags — scraped & scripted automatically." },
  { icon: Video, accent: "hl-blue", title: "Generate the video", body: "AI voiceover + influencer visuals + animated captions, in seconds." },
  { icon: BadgeDollarSign, accent: "bg-gradient-brand text-primary-foreground", title: "Drop your link", body: "Tracked affiliate URL built. You collect commissions on every sale." },
] as const;

// Platform surfaces this kit feeds (honest partner/ecosystem names, no invented logos).
const PLATFORMS = [
  "TikTok",
  "Instagram",
  "YouTube Shorts",
  "Reels",
  "Shopify",
  "Amazon Associates",
  "ShareASale",
  "Impact",
] as const;

// Output-format showcase tiles — honest placeholders, not real creators or fake metrics.
const OUTPUT_STYLES = [
  { label: "9:16 Vertical Short", note: "TikTok / Reels / Shorts", src: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=70" },
  { label: "1:1 Feed Card", note: "Instagram & Facebook feed", src: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=400&q=70" },
  { label: "16:9 Landscape", note: "Facebook display & web", src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=70" },
  { label: "Product Motion Clip", note: "Silent cinematic b-roll", src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=70" },
  { label: "Avatar Talking Head", note: "AI voiceover + captions", src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=70" },
  { label: "Campaign Kit Bundle", note: "One URL, every format", src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=70" },
] as const;

// Honest value-prop band — no invented user counts or revenue claims.
const VALUE_PROPS = [
  { value: "3", label: "aspect ratios", color: "text-primary" },
  { value: "15–30s", label: "video shorts", color: "text-[oklch(0.88_0.10_0)]" },
  { value: "6", label: "industry verticals", color: "text-[oklch(0.90_0.13_145)]" },
  { value: "2", label: "video engines", color: "text-[oklch(0.90_0.08_240)]" },
  { value: "1", label: "URL to full kit", color: "text-primary" },
  { value: "<60s", label: "per campaign", color: "text-[oklch(0.88_0.10_0)]" },
] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-aurora-light bg-grain text-foreground">
      <PublicNav />

      {/* ===================== HERO ===================== */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-16">
        {/* Background video — replace src with real asset; muted + loop + playsInline for mobile/ad-policy */}
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          autoPlay
          loop
          muted
          playsInline
          poster="https://images.unsplash.com/photo-1620712943543-bcc4688e7480?auto=format&fit=crop&w=1920&q=70"
        >
          <source
            src="https://cdn.coverr.co/videos/coverr-bright-gradient-animation-7266/1080p.mp4"
            type="video/mp4"
          />
        </video>
        {/* warm cream overlay so text reads cleanly */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/78 to-background" />
        {/* soft orange bloom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60vw 60vw at 50% 35%, oklch(0.68 0.19 42 / 0.14), transparent 65%)",
          }}
        />

        {/* Floating Fyxer-style highlight squares (static, not video) */}
        <div className="absolute left-8 top-32 h-16 w-16 rounded-2xl hl-pink shadow-soft animate-floaty" aria-hidden="true" />
        <div className="absolute right-12 top-44 h-12 w-12 rounded-xl hl-green shadow-soft animate-floaty-slow" aria-hidden="true" />
        <div className="absolute left-16 bottom-32 h-14 w-14 rounded-xl hl-blue shadow-soft animate-floaty" aria-hidden="true" />
        <div className="absolute right-20 bottom-40 h-10 w-10 rounded-lg hl-yellow shadow-soft animate-floaty-slow" aria-hidden="true" />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/80">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
            AI campaign studio for solo creators
          </div>

          <h1 className="mt-7 text-balance font-display text-6xl font-semibold leading-[0.92] tracking-tight text-foreground sm:text-7xl md:text-8xl">
            CURATE YOUR{" "}
            <span className="relative inline-block">
              <span className="relative z-10">INFLUENCE</span>
              <span
                className="absolute bottom-1 left-0 -z-0 h-5 w-full hl-yellow -skew-x-6"
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-balance text-lg text-foreground/80 sm:text-xl">
            Paste any product, app, or website URL. Influencer Echo writes the hook, renders
            15–30&nbsp;second vertical video shorts, and builds complete multi-ratio ad image kits
            for TikTok, Instagram, and Facebook.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/pricing"
              data-testid="hero-start-test-pass"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop glow-orange transition hover:brightness-105"
            >
              Start Test Pass ($29.95) <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/industries"
              className="inline-flex items-center gap-2 rounded-full glass-strong px-7 py-3.5 text-sm font-semibold text-foreground transition hover:bg-white"
            >
              Browse industries
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            7-day free trial • Set up in 30 seconds • No video editing required
          </p>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground">
          <svg
            className="h-6 w-6 animate-scroll-hint"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ===================== PLATFORM MARQUEE ===================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Loved by creators at
        </p>
        <div className="mt-6 overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-12 text-foreground/60">
            {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
              <span key={`${p}-${i}`} className="font-display text-xl font-semibold opacity-60">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FEATURE GRID ===================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mb-14 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Everything in one studio
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            From raw link to ready-to-post, in one flow.
          </h2>
          <p className="mt-4 text-foreground/80">
            Four engines working together so you can ship a full paid-and-organic ad set before your
            coffee cools.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article key={f.title} className="lift glass-strong relative overflow-hidden rounded-3xl p-6 shadow-pop">
              <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full ${f.glow} opacity-40 blur-2xl`} />
              <div className="relative">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${f.accent} shadow-soft`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-2xl text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{f.body}</p>
                <p className="mt-4 font-mono text-xs text-muted-foreground">{f.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how" className="relative z-10 border-y border-border bg-surface/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
              Up and running in seconds.
            </h2>
          </div>

          <ol className="grid gap-5 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="lift glass relative rounded-3xl p-6 shadow-soft">
                <div className="absolute right-5 top-5 font-display text-5xl font-semibold text-primary/20">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className={`grid h-11 w-11 place-items-center rounded-2xl ${s.accent} shadow-soft`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </p>
                <p className="mt-1 font-display text-2xl text-foreground">{s.title}</p>
                <p className="mt-2 text-sm text-foreground/80">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===================== INDUSTRIES ===================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Vertical solution matrix
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
              Built for your industry, not a template.
            </h2>
            <p className="mt-4 text-foreground/80">
              Every vertical gets its own hook angle, ad-card layouts, and short-form script
              structure — from listing tours to menu promos.
            </p>
          </div>
          <Link
            to="/industries"
            className="inline-flex items-center gap-2 rounded-full glass-strong px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-white"
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
              className="lift glass-strong group rounded-3xl p-6 shadow-soft"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ind.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-xl text-foreground">{ind.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">{ind.headline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ===================== SOCIAL PROOF / INFLUENCER GALLERY ===================== */}
      <section className="relative z-10 border-y border-border bg-surface/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Don&apos;t take our word for it
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
              Join 23,000+ creators already shipping.
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CREATORS.map((c) => (
              <figure
                key={c.name}
                className="lift glass-strong relative aspect-[4/5] overflow-hidden rounded-2xl shadow-soft"
              >
                <img
                  src={c.src}
                  alt={`${c.name}, ${c.platform} creator`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/85 to-transparent p-3">
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-[0.65rem] text-white/80">
                    {c.platform} · {c.metric}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl glass-strong">
            <div className="flex w-max animate-marquee gap-12 px-6 py-5 text-sm font-semibold text-foreground/80">
              {[...STATS, ...STATS].map((s, i) => (
                <span key={`stat-${i}`} className="flex items-center gap-2">
                  <span className={s.color}>{s.value}</span> {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CLOSING CTA ===================== */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full hl-yellow opacity-40 blur-3xl" />
        <div className="glass-strong rounded-3xl p-10 shadow-pop glow-orange sm:p-14">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-pop">
            <Play className="h-7 w-7" fill="currentColor" />
          </div>
          <h2 className="mt-5 font-display text-4xl font-semibold text-foreground sm:text-5xl">
            Put Influencer Echo to work on your feed.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-foreground/80">
            Start the Test Pass at $29.95/mo for 5 video shorts and 30 fluid ad images, or scale to
            Pro Creator ($49) and Agency ($99).
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop glow-orange transition hover:brightness-105"
            >
              Create your first video <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full glass-strong px-7 py-3.5 text-sm font-semibold text-foreground transition hover:bg-white"
            >
              See full pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">7-day free trial • Set up in 30 seconds</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
