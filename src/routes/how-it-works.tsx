import { createFileRoute, Link } from "@tanstack/react-router";
import { Link2, Sparkles, Video, BadgeDollarSign, ArrowRight } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Influencer Echo works — Product URL to affiliate video in 60 seconds" },
      {
        name: "description",
        content:
          "See the 4-step pipeline: paste a product URL, AI ingests it, generates a 15s influencer video with voiceover, and hands you a tracked affiliate link.",
      },
      { property: "og:title", content: "How Influencer Echo works" },
      {
        property: "og:description",
        content: "From product URL to postable affiliate video in under a minute.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/how-it-works" },
    ],
    links: [{ rel: "canonical", href: "/how-it-works" }],
  }),
  component: HowItWorks,
});

const STEPS = [
  {
    i: Link2,
    t: "Paste the product URL",
    d: "Works with Amazon, AliExpress, Shopify, or any product URL. We use Firecrawl to pull the title, price, imagery, and description.",
  },
  {
    i: Sparkles,
    t: "AI ingests and scripts it",
    d: "Gemini extracts a clean product record and drafts a 15-second hook-driven script tuned to your saved persona's tone, catchphrases, and niche.",
  },
  {
    i: Video,
    t: "Generate the video with HeyGen",
    d: "A HeyGen avatar performs the script in an authentic influencer style. ElevenLabs voice on the backup pipeline. Captions burned in. Vertical 720x1280 MP4.",
  },
  {
    i: BadgeDollarSign,
    t: "Drop your tracked affiliate link",
    d: "We build a short /r/CODE link tied to your affiliate program ID. Click-tracked, deep-linked, and ready for your TikTok, Reels, or Shorts caption.",
  },
];

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <PublicNav />
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <h1 className="font-display text-5xl md:text-6xl">How it works</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Four steps between a product URL and a video ready to post.
        </p>
        <div className="mt-12 space-y-8">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="flex gap-6 rounded-2xl border border-border bg-card p-6 shadow-pop"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.i className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {i + 1}
                </p>
                <p className="mt-1 font-display text-2xl">{s.t}</p>
                <p className="mt-2 text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center">
          <h2 className="font-display text-3xl">Ready to try it?</h2>
          <p className="mt-2 text-muted-foreground">3 videos free. No credit card.</p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
          >
            Start ripping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
