import {
  Home,
  MonitorSmartphone,
  ShoppingBag,
  Wrench,
  UtensilsCrossed,
  Scale,
  type LucideIcon,
} from "lucide-react";

export interface IndustryOutput {
  /** Short label, e.g. "9:16 Property Tour Short" */
  label: string;
  /** Which surface it fills */
  ratio: "1:1" | "9:16" | "16:9" | "video";
}

export interface Industry {
  slug: string;
  category: string;
  name: string;
  icon: LucideIcon;
  headline: string;
  description: string;
  /** Raw inputs the user pastes in — the "before" side of the preview */
  before: string[];
  outputs: IndustryOutput[];
  hookAngle: string;
  featured?: boolean;
  featuredBadge?: string;
}

export const INDUSTRY_CATEGORIES = [
  "All",
  "Real Estate",
  "SaaS & Apps",
  "E-Commerce",
  "Local Services",
  "Restaurants",
  "Professional Services",
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

export const INDUSTRIES: Industry[] = [
  {
    slug: "real-estate",
    category: "Real Estate",
    name: "Real Estate & Brokerages",
    icon: Home,
    headline: "Turn property URLs into virtual open house video hooks & listing promo cards",
    description:
      "Paste a listing link and get an agent-avatar walkthrough short plus the Just Listed and Just Sold cards your feed needs the same afternoon.",
    before: ["Zillow / MLS listing URL", "Brokerage site page", "Listing photo gallery"],
    outputs: [
      { label: "Property tour short (15–30s)", ratio: "video" },
      { label: "Instagram feed listing card", ratio: "1:1" },
      { label: "Just Listed / Sold story", ratio: "9:16" },
      { label: "Open house banner", ratio: "16:9" },
    ],
    hookAngle:
      "Automated agent avatar introductions and neighborhood highlight scripts pulled straight from the listing details.",
    featured: true,
    featuredBadge: "High conversion for brokerages & agents",
  },
  {
    slug: "saas-apps",
    category: "SaaS & Apps",
    name: "SaaS & Digital Apps",
    icon: MonitorSmartphone,
    headline: "Transform app screenshots into high-converting UI mockups & feature demos",
    description:
      "Drop an App Store link or a landing page and Echo frames your product in real devices, then narrates the core feature in a vertical short.",
    before: ["App Store / Play Store URL", "SaaS landing page", "Product screenshots"],
    outputs: [
      { label: "Product walk-through short (15–30s)", ratio: "video" },
      { label: "Mobile device mockup card", ratio: "1:1" },
      { label: "Feature highlight story", ratio: "9:16" },
      { label: "Browser-framed desktop banner", ratio: "16:9" },
    ],
    hookAngle:
      "Problem-first hooks that open on the pain, then cut to the interface solving it in one tap.",
  },
  {
    slug: "ecommerce",
    category: "E-Commerce",
    name: "E-Commerce & Retail",
    icon: ShoppingBag,
    headline: "Convert product pages into multi-format ad kits & UGC-style video hooks",
    description:
      "One product URL becomes a full paid-and-organic set: showcase cards, discount overlays, and an avatar review sized for TikTok and Reels.",
    before: ["Shopify / Amazon product URL", "Marketplace listing", "Product image set"],
    outputs: [
      { label: "UGC-style avatar review (15–30s)", ratio: "video" },
      { label: "Product showcase card", ratio: "1:1" },
      { label: "TikTok / Reel promo", ratio: "9:16" },
      { label: "Sale & discount overlay banner", ratio: "16:9" },
    ],
    hookAngle:
      "Benefit-forward hooks lifted from the real product page copy — no invented claims, no fake reviews.",
  },
  {
    slug: "local-services",
    category: "Local Services",
    name: "Local Services & Contractors",
    icon: Wrench,
    headline: "Local lead-generation creatives that build instant trust & drive quotes",
    description:
      "HVAC, solar, auto, and home services: turn your service page into before/after proof cards and quote-driving shorts with a clear local CTA.",
    before: ["Service page URL", "Google Business profile", "Job photos"],
    outputs: [
      { label: "Review highlight short (15–30s)", ratio: "video" },
      { label: "Before / after transformation card", ratio: "1:1" },
      { label: "Seasonal offer story", ratio: "9:16" },
      { label: "Promotional discount banner", ratio: "16:9" },
    ],
    hookAngle:
      "Trust-first scripts: service area, response time, and the exact next step to request a quote.",
  },
  {
    slug: "restaurants",
    category: "Restaurants",
    name: "Restaurants & Hospitality",
    icon: UtensilsCrossed,
    headline: "Mouth-watering menu promos & local event announcement kits",
    description:
      "Menu links and event pages become daily special cards, geo-targeted story ads, and short announcements you can post before the dinner rush.",
    before: ["Menu / ordering page URL", "Event page", "Dish photos"],
    outputs: [
      { label: "Event announcement short (15–30s)", ratio: "video" },
      { label: "Daily special promo card", ratio: "1:1" },
      { label: "Geo-targeted story ad", ratio: "9:16" },
      { label: "Happy hour landscape banner", ratio: "16:9" },
    ],
    hookAngle:
      "Appetite-driven opens with the dish on screen in the first second and the hours and location in the last.",
  },
  {
    slug: "professional-services",
    category: "Professional Services",
    name: "Professional Services",
    icon: Scale,
    headline: "Authority-building ad kits that establish expertise and drive consultations",
    description:
      "Legal, medical, finance, and coaching: turn your practice page into quick-tip shorts and service summary cards that book the consult.",
    before: ["Practice / service page URL", "Bio or credentials page", "Booking link"],
    outputs: [
      { label: "Quick-tip authority short (15–30s)", ratio: "video" },
      { label: "Client testimonial card", ratio: "1:1" },
      { label: "Consultation booking story", ratio: "9:16" },
      { label: "Service summary banner", ratio: "16:9" },
    ],
    hookAngle:
      "Educational hooks that answer one real client question, then route to your booking link.",
  },
];
