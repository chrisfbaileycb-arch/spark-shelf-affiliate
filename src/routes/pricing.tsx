import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — ReelRipper" },
      {
        name: "description",
        content:
          "Simple flat pricing. Starter at $29.95/mo for 15 AI affiliate videos. Pro at $59.95/mo for 30. Cancel anytime. 3 videos free to start.",
      },
      { property: "og:title", content: "ReelRipper Pricing — Starter & Pro plans" },
      {
        property: "og:description",
        content: "15 or 30 AI-generated affiliate videos every month. Cancel anytime.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/pricing" },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PublicPricing,
});

const PLANS = [
  {
    name: "Starter",
    price: "$29.95",
    videos: 15,
    features: [
      "15 videos / month",
      "Persona generator",
      "Affiliate link tracking",
      "HD 720x1280 output",
      "2 months free per referral",
    ],
  },
  {
    name: "Pro",
    price: "$59.95",
    videos: 30,
    features: [
      "30 videos / month",
      "Unlimited personas",
      "Priority rendering",
      "Affiliate link tracking",
      "HD 720x1280 output",
      "2 months free per referral",
    ],
    highlight: true,
  },
];

function PublicPricing() {
  return (
    <div className="min-h-screen bg-background bg-grain">
      <PublicNav />
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="text-center">
          <h1 className="font-display text-5xl md:text-6xl">
            Pricing that scales with your posts.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free with 3 videos. Upgrade when you're ready to scale.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-8 shadow-pop ${p.highlight ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
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
                Start free trial
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
