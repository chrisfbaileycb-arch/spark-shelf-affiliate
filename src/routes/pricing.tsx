import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Influencer Echo" },
      {
        name: "description",
        content:
          "Test the Waters at $19.95/mo for 3 AI affiliate videos, Starter at $39.95 for 15, Pro Scale at $69.95 for 30. Cancel anytime.",
      },
      { property: "og:title", content: "Influencer Echo Pricing — Test, Starter & Pro Scale" },
      {
        property: "og:description",
        content: "3, 15, or 30 AI-generated affiliate videos every month. Cancel anytime.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PublicPricing,
});

type Plan = {
  name: string;
  price: string;
  videos: number;
  cta: string;
  badge?: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Test the Waters",
    price: "$19.95",
    videos: 3,
    cta: "Start Test Pass ($19.95)",
    features: [
      "3 AI videos / month",
      "Full persona generator & hook writer",
      "Click-tracked affiliate links",
      "HD 720x1280 vertical output",
      "2 months free per referral",
    ],
  },
  {
    name: "Starter",
    price: "$39.95",
    videos: 15,
    cta: "Get Starter ($39.95)",
    badge: "Most popular",
    features: [
      "15 AI videos / month",
      "Full persona generator & hook writer",
      "Affiliate tracking & performance dashboard",
      "Priority rendering queue",
      "2 months free per referral",
    ],
    highlight: true,
  },
  {
    name: "Pro Scale",
    price: "$69.95",
    videos: 30,
    cta: "Scale to Pro ($69.95)",
    features: [
      "30 AI videos / month — one a day",
      "Unlimited personas & niche test profiles",
      "Ultra-fast priority rendering queue",
      "Advanced affiliate tracking & analytics",
      "2 months free per referral",
    ],
  },
];

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
            Test the waters with 3 videos for $19.95, or unlock daily posts with Starter.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-8 shadow-pop ${p.highlight ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              {p.badge && (
                <p className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {p.badge}
                </p>
              )}
              <p className="font-display text-2xl">{p.name}</p>
              <p className="mt-2 text-4xl font-semibold">
                {p.price}
                <span className="text-base text-muted-foreground">/mo</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{p.videos} AI videos every month</p>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="mt-8 block rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground hover:opacity-95"
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Prices in USD. Cancel anytime from your billing page. Video generation costs are included
          in your plan.
        </p>
      </section>
      <PublicFooter />
    </div>
  );
}
