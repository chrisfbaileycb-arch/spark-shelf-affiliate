import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Link2,
  Video,
  CalendarDays,
  Share2,
  Image as ImageIcon,
  LayoutGrid,
  Megaphone,
} from "lucide-react";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { BrandMark } from "@/components/BrandMark";
import { INDUSTRIES } from "@/lib/industries";

const TITLE = "Echo Your Influence — All we do is marketing for you";
const DESCRIPTION =
  "Plan, create, and schedule your own marketing in one place. AI strategy, video shorts, multi-ratio ad images, a content calendar, and a two-tap posting hand-off.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
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
              name: "Echo Your Influence",
              description: "A personal marketing agency in a box.",
              url: "/",
            },
            {
              "@type": "WebSite",
              name: "Echo Your Influence",
              url: "/",
              description: DESCRIPTION,
            },
            {
              "@type": "SoftwareApplication",
              name: "Echo Your Influence",
              applicationCategory: "BusinessApplication",
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

/** The five things the app actually does today. */
const CAPABILITIES = [
  {
    icon: Sparkles,
    accent: "hl-yellow",
    title: "Strategy first",
    body: "Paste a link or describe your business. You get positioning, audience, and the angles worth posting about.",
    meta: "brief · icp · messaging",
  },
  {
    icon: Video,
    accent: "hl-pink",
    title: "Video shorts",
    body: "15–30 second vertical shorts: avatar narration with captions, or silent cinematic b-roll when you want motion only.",
    meta: "9:16 · two engines",
  },
  {
    icon: ImageIcon,
    accent: "hl-green",
    title: "Ad image kits",
    body: "The same concept rendered 1:1, 9:16, and 16:9 in one pass, so no surface sits empty while your budget goes to one boost.",
    meta: "1:1 · 9:16 · 16:9",
  },
  {
    icon: CalendarDays,
    accent: "hl-blue",
    title: "Content calendar",
    body: "Every day gets its own workspace: hook, script, prompts, caption, hashtags, and the disclosure line when one is required.",
    meta: "week · 4-week · month",
  },
  {
    icon: Share2,
    accent: "hl-orange",
    title: "Two-tap hand-off",
    body: "Copy the caption, then open TikTok, Reels, Shorts, or Facebook with the video attached. No account linking, no API keys.",
    meta: "copy · share · mark posted",
  },
  {
    icon: LayoutGrid,
    accent: "hl-yellow",
    title: "One campaign spine",
    body: "Brief, strategy, content pack, calendar, and results live inside a single resumable campaign you can pick back up anytime.",
    meta: "resumable · per campaign",
  },
] as const;

const STEPS = [
  { icon: Link2, title: "Bring the subject", body: "A product URL, your listing, your menu, your app — or type it in by hand." },
  { icon: Sparkles, title: "Get the plan", body: "Positioning, hooks, and a posting rhythm shaped to what you actually sell." },
  { icon: Video, title: "Generate the assets", body: "Shorts and multi-ratio ad images render from the same source in one pass." },
  { icon: Megaphone, title: "Post on your terms", body: "Schedule it on the calendar, then hand it off to the app in two taps." },
] as const;

/** Surfaces the hand-off targets. Honest phrasing: works with, not endorsed by. */
const SURFACES = ["TikTok", "Instagram Reels", "YouTube Shorts", "Facebook", "LinkedIn"] as const;

const FACTS = [
  { value: "3", label: "aspect ratios per concept" },
  { value: "15–30s", label: "vertical short length" },
  { value: "2", label: "video engines" },
  { value: "0", label: "social passwords stored" },
] as const;

function Landing() {
  return (
    <div className="min-h-screen bg-aurora-light bg-grain text-foreground">
      <PublicNav />

      {/* ===================== HERO (split copy + preview card) ===================== */}
      <section className="relative overflow-hidden pt-32 pb-16 sm:pt-36">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/75">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
              Your marketing agency in a box
            </div>

            <h1 className="mt-6 text-balance font-display text-5xl uppercase leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
              Echo your{" "}
              <span className="relative inline-block">
                <span className="relative z-10">influence</span>
                <span
                  className="absolute bottom-1 left-0 h-4 w-full -skew-x-6 hl-yellow"
                  aria-hidden="true"
                />
              </span>
            </h1>

            <p className="mt-4 font-display text-lg uppercase tracking-[0.12em] text-primary">
              All we do is marketing for you.
            </p>

            <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-foreground/80">
              Whether you sell products, houses, roofs, dinner reservations, or your own app —
              this is the one place to plan it, create it, date it, and post it. You control the
              flow, the speed, and the spend.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/auth"
                data-testid="hero-start-free-trial"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop transition-transform hover:-translate-y-0.5"
              >
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/how-it-works"
                data-testid="hero-how-it-works"
                className="inline-flex items-center gap-2 rounded-full glass-strong px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card"
              >
                See how it works
              </Link>
            </div>

            <p className="mt-4 font-mono text-xs text-muted-foreground">
              No camera. No editing suite. No social passwords stored.
            </p>
          </div>

          {/* Preview card — an honest illustration of the daily workspace */}
          <div className="relative">
            <div className="absolute -right-6 -top-8 h-24 w-24 rounded-2xl hl-green shadow-soft animate-floaty" aria-hidden="true" />
            <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-xl hl-blue shadow-soft animate-floaty-slow" aria-hidden="true" />

            <div className="lift relative rounded-3xl glass-strong p-6 shadow-pop">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <BrandMark className="h-8 w-8 shrink-0" />
                  <p className="truncate font-display text-sm uppercase tracking-wide">
                    Tuesday · post 1
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-3 py-1 font-mono text-[0.65rem] uppercase text-muted-foreground">
                  Draft
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="rounded-2xl bg-surface/80 p-4">
                  <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    Hook
                  </p>
                  <p className="mt-1 text-foreground/85">
                    &ldquo;Three things buyers notice in the first ten seconds.&rdquo;
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { r: "9:16", n: "Short" },
                    { r: "1:1", n: "Feed" },
                    { r: "16:9", n: "Display" },
                  ].map((f) => (
                    <div key={f.r} className="rounded-2xl bg-surface/80 p-3 text-center">
                      <p className="font-mono text-xs text-primary">{f.r}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{f.n}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-surface/80 p-4">
                  <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    Hand-off
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Copy caption", "Open TikTok", "Mark posted"].map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SURFACES (honest: works with) ===================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-6">
        <div className="rounded-3xl border border-border bg-surface/60 px-6 py-5">
          <p className="text-center font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            Hands off to
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {SURFACES.map((s) => (
              <span key={s} className="font-display text-lg uppercase text-foreground/55">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CAPABILITY CARD GRID ===================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            What you get
          </p>
          <h2 className="mt-3 font-display text-4xl uppercase leading-tight text-foreground sm:text-5xl">
            Everything an agency would do, minus the retainer.
          </h2>
          <p className="mt-4 text-foreground/80">
            One workspace that carries an idea from &ldquo;I should market this&rdquo; all the way
            to a post going out on the day you chose.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <article
              key={c.title}
              data-testid={`capability-${c.title.toLowerCase().replace(/\s+/g, "-")}`}
              className="lift glass-strong relative overflow-hidden rounded-3xl p-6 shadow-soft"
            >
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${c.accent} shadow-soft`}>
                <c.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-xl uppercase text-foreground">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">{c.body}</p>
              <p className="mt-4 font-mono text-xs text-muted-foreground">{c.meta}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how" className="relative z-10 border-y border-border bg-surface/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-3 font-display text-4xl uppercase leading-tight text-foreground sm:text-5xl">
              Four steps, start to posted.
            </h2>
          </div>

          <ol className="grid gap-5 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="lift relative rounded-3xl glass p-6 shadow-soft">
                <div className="absolute right-5 top-4 font-display text-4xl text-primary/15">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 font-display text-lg uppercase text-foreground">{s.title}</p>
                <p className="mt-2 text-sm text-foreground/80">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===================== WHO IT'S FOR ===================== */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Who it&apos;s for</p>
            <h2 className="mt-3 font-display text-4xl uppercase leading-tight text-foreground sm:text-5xl">
              If you sell something, this is for you.
            </h2>
            <p className="mt-4 text-foreground/80">
              Pick the mode that matches your work and the hooks, formats, and disclosure rules
              adjust to it. Nothing here assumes you&apos;re an influencer.
            </p>
          </div>
          <Link
            to="/industries"
            className="inline-flex shrink-0 items-center gap-2 rounded-full glass-strong px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <Link
              key={ind.slug}
              to="/industries"
              data-testid={`home-industry-${ind.slug}`}
              className="lift glass-strong rounded-3xl p-6 shadow-soft"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ind.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-lg uppercase text-foreground">{ind.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">{ind.headline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ===================== FACTS (verifiable product facts only) ===================== */}
      <section className="relative z-10 border-y border-border bg-surface/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-14 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.label}>
              <p className="font-mono text-3xl text-primary">{f.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== CLOSING CTA ===================== */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="rounded-3xl glass-strong p-10 shadow-pop sm:p-14">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-pop">
            <Megaphone className="h-7 w-7" />
          </div>
          <h2 className="mt-5 font-display text-4xl uppercase leading-tight text-foreground sm:text-5xl">
            Start marketing on your own terms.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-foreground/80">
            Build your first campaign, fill a week of the calendar, and hand the first post off
            from your phone.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop transition-transform hover:-translate-y-0.5"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full glass-strong px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
