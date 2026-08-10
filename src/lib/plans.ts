// Single source of truth for plan tiers, prices, and monthly allowances.
// Mirrors public.plan_limits() in the database — keep both in sync.

export type TierId = "trial" | "test" | "starter" | "pro" | "agency";

export interface Plan {
  /** Stripe price lookup key */
  priceId: string;
  tier: Exclude<TierId, "trial" | "test">;
  name: string;
  price: string;
  amountCents: number;
  videos: number;
  images: number;
  cta: string;
  badge?: string;
  highlight?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    priceId: "starter_monthly",
    tier: "starter",
    name: "Starter",
    price: "$29.95",
    amountCents: 2995,
    videos: 5,
    images: 30,
    cta: "Start Test Pass ($29.95)",
    features: [
      "5 AI video shorts (15–30s) / month",
      "30 fluid ad images & app/web mockups / month",
      "15s & 30s script hook engine",
      "Standard rendering queue",
    ],
  },
  {
    priceId: "pro_monthly",
    tier: "pro",
    name: "Pro Creator",
    price: "$49",
    amountCents: 4900,
    videos: 15,
    images: 150,
    cta: "Go Pro Creator ($49)",
    badge: "Most popular",
    highlight: true,
    features: [
      "15 AI video shorts (15–30s) / month",
      "150 fluid ad images & app/web mockups / month",
      "Priority rendering queue",
      "Multi-ratio campaign exports (1:1, 9:16, 16:9)",
    ],
  },
  {
    priceId: "agency_monthly",
    tier: "agency",
    name: "Agency",
    price: "$99",
    amountCents: 9900,
    videos: 30,
    images: 500,
    cta: "Scale to Agency ($99)",
    features: [
      "30 AI video shorts (15–30s) / month",
      "500 fluid ad images & app/web mockups / month",
      "Ultra-fast priority rendering queue",
      "Real estate & local business campaign kits",
      "White-label / agency team exports",
    ],
  },
];

export const PLAN_LIMITS: Record<TierId, { videos: number; images: number }> = {
  trial: { videos: 0, images: 0 },
  test: { videos: 5, images: 30 }, // legacy tier, treated as Starter
  starter: { videos: 5, images: 30 },
  pro: { videos: 15, images: 150 },
  agency: { videos: 30, images: 500 },
};

export const TIER_LABEL: Record<TierId, string> = {
  trial: "No plan",
  test: "Starter (legacy)",
  starter: "Starter",
  pro: "Pro Creator",
  agency: "Agency",
};

export function tierFromLookupKey(
  key: string | null | undefined,
): Exclude<TierId, "trial"> | null {
  if (key === "starter_monthly") return "starter";
  if (key === "pro_monthly") return "pro";
  if (key === "agency_monthly") return "agency";
  if (key === "test_monthly") return "test"; // legacy grandfathered price
  return null;
}

export function monthlyCentsForTier(tier: TierId): number {
  const plan = PLANS.find((p) => p.tier === tier);
  if (plan) return plan.amountCents;
  return tier === "test" ? 1995 : 0;
}

/** Copy shown when a plan is required before a render can run. */
export const PLAN_REQUIRED_MESSAGE =
  "Pick a plan to start generating — the Test Pass is $29.95/mo for 5 video shorts and 30 fluid ad images.";
