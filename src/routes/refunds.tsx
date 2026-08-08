import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Influencer Echo" },
      {
        name: "description",
        content: "Influencer Echo's refund policy for subscription plans and video credits.",
      },
      { property: "og:title", content: "Influencer Echo Refund Policy" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/refunds" },
    ],
    links: [{ rel: "canonical", href: "/refunds" }],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <article className="prose prose-neutral mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl">Refund Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: October 2025</p>

        <h2>Free trial</h2>
        <p>
          Every new account gets 3 free videos before entering any paid plan. Use the trial to
          decide whether Influencer Echo fits your workflow.
        </p>

        <h2>Monthly subscriptions</h2>
        <p>
          Because video generation costs us real per-render fees from HeyGen and ElevenLabs,
          subscription payments are generally non-refundable once billed. You can cancel at any time
          from your billing page and you will keep access until the end of the current billing
          period; you will not be charged again.
        </p>

        <h2>When we will issue a refund</h2>
        <ul>
          <li>
            <strong>Duplicate charge</strong> caused by a billing system error.
          </li>
          <li>
            <strong>Zero usage</strong>: if you were billed for a renewal and generated zero videos
            in that billing period, email us within 7 days for a full refund of that period.
          </li>
          <li>
            <strong>Sustained outage</strong>: if a documented Service outage prevented you from
            generating videos for more than 48 hours in a billing period, we will pro-rate a credit
            or refund.
          </li>
        </ul>

        <h2>How to request</h2>
        <p>
          Email support@influencerecho.app from the address on your account with your Stripe
          receipt. We respond within 3 business days.
        </p>

        <h2>Chargebacks</h2>
        <p>
          Please contact us before filing a chargeback. Chargebacks are expensive to dispute and we
          would rather resolve the issue directly.
        </p>
      </article>
      <PublicFooter />
    </div>
  );
}
