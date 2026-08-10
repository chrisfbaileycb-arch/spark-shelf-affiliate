import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySubscription } from "@/lib/billing.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({
    meta: [
      { title: "Pricing — Influencer Echo" },
      {
        name: "description",
        content:
          "Test, Starter and Pro Scale plans for Influencer Echo — 3, 15 or 30 AI affiliate videos every month, cancel anytime.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Pricing,
});

type Plan = {
  id: string;
  tier: string;
  name: string;
  price: string;
  videos: number;
  cta: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "test_monthly",
    tier: "test",
    name: "Test the Waters",
    price: "$19.95",
    videos: 3,
    cta: "Start Test Pass ($19.95)",
    features: [
      "3 videos per month",
      "Persona generator & hook writer",
      "Click-tracked affiliate links",
      "HD 720x1280 output",
    ],
  },
  {
    id: "starter_monthly",
    tier: "starter",
    name: "Starter",
    price: "$39.95",
    videos: 15,
    cta: "Get Starter ($39.95)",
    features: [
      "15 videos per month",
      "Persona generator & hook writer",
      "Affiliate tracking & performance dashboard",
      "Priority rendering queue",
    ],
    highlight: true,
  },
  {
    id: "pro_monthly",
    tier: "pro",
    name: "Pro Scale",
    price: "$69.95",
    videos: 30,
    cta: "Scale to Pro ($69.95)",
    features: [
      "30 videos per month — one a day",
      "Unlimited personas & niche test profiles",
      "Ultra-fast priority rendering",
      "Advanced affiliate tracking & analytics",
    ],
  },
];

function Pricing() {
  const [session, setSession] = useState<Session | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const ms = useServerFn(getMySubscription);
  const subQ = useQuery({ queryKey: ["mySub"], queryFn: () => ms() });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  if (picked && session) {
    return (
      <div className="space-y-4">
        <PaymentTestModeBanner />
        <Button variant="ghost" onClick={() => setPicked(null)}>
          ← Back to pricing
        </Button>
        <StripeEmbeddedCheckout
          priceId={picked}
          customerEmail={session.user.email}
          userId={session.user.id}
          returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
        />
      </div>
    );
  }

  const currentTier = subQ.data?.tier ?? "trial";

  return (
    <div className="space-y-8">
      <PaymentTestModeBanner />
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Pricing
        </p>
        <h1 className="mt-1 font-display text-4xl">Pick your plan</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Every plan includes the persona generator, hook writer, and tracked affiliate links.
        </p>
        {currentTier !== "trial" && (
          <p className="mt-2 text-sm">
            Current plan: <strong className="capitalize">{currentTier}</strong>
          </p>
        )}
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`p-8 ${plan.highlight ? "border-primary shadow-pop" : ""}`}
          >
            {plan.highlight && (
              <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Most popular
              </div>
            )}
            <h2 className="font-display text-3xl">{plan.name}</h2>
            <p className="mt-2 text-4xl font-bold">
              {plan.price}
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
            <ul className="mt-6 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => setPicked(plan.id)}
              className="mt-6 w-full"
              variant={plan.highlight ? "default" : "secondary"}
              disabled={currentTier === plan.tier}
            >
              {currentTier === plan.tier ? "Current plan" : plan.cta}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
