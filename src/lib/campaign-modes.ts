/**
 * Campaign modes — what kind of business the content is being made for.
 *
 * Echo Your Influence started as an affiliate-only engine. The modes below open the
 * same pipeline (brief → script → video/image prompts → caption → share-sheet
 * hand-off) to any operator marketing their own work: a listing, a remodel, a
 * dish, a service call, a launch.
 *
 * Truth rules per mode live in `disclosureRule` — an affiliate post needs an
 * FTC disclosure; a contractor filming his own bathroom remodel does not, and
 * pretending otherwise would be noise.
 */
import {
  Home,
  Hammer,
  UtensilsCrossed,
  Wrench,
  Briefcase,
  MonitorSmartphone,
  ShoppingBag,
  Link2,
  type LucideIcon,
} from "lucide-react";

export type CampaignModeId =
  | "affiliate"
  | "real_estate"
  | "home_services"
  | "restaurant"
  | "local_service"
  | "professional"
  | "saas_app"
  | "ecommerce_brand";

export interface CampaignMode {
  id: CampaignModeId;
  label: string;
  /** What a single record is called in this mode. */
  subject: string;
  icon: LucideIcon;
  /** One plain line shown under the option. */
  blurb: string;
  /** Placeholder for the URL field, or null when a link is rarely available. */
  urlPlaceholder: string | null;
  /** Prompt for the manual-entry title field. */
  titlePlaceholder: string;
  /** Prompt for the manual-entry description field. */
  detailPlaceholder: string;
  /** Steer for the script writer. */
  angle: string;
  /** Whether posts in this mode carry an affiliate disclosure. */
  disclosureRule: "affiliate" | "none";
}

export const CAMPAIGN_MODES: CampaignMode[] = [
  {
    id: "affiliate",
    label: "Affiliate product",
    subject: "product",
    icon: Link2,
    blurb: "Someone else's product, your commissionable link.",
    urlPlaceholder: "https://www.amazon.com/dp/...",
    titlePlaceholder: "Product name",
    detailPlaceholder: "What it does and who it's for.",
    angle:
      "Creator-to-creator product recommendation. Lead with the single most useful thing the product does.",
    disclosureRule: "affiliate",
  },
  {
    id: "real_estate",
    label: "Real estate listing",
    subject: "listing",
    icon: Home,
    blurb: "A property tour, open house, or just-sold post.",
    urlPlaceholder: "https://www.zillow.com/homedetails/...",
    titlePlaceholder: "123 Maple St — 3 bed / 2 bath",
    detailPlaceholder:
      "Beds, baths, square footage, neighborhood, standout features, price, open house time.",
    angle:
      "Walk the viewer through the property the way an agent would on a tour: arrival, the one room that sells it, the practical detail buyers ask about, then how to see it.",
    disclosureRule: "none",
  },
  {
    id: "home_services",
    label: "Contractor / trade",
    subject: "project",
    icon: Hammer,
    blurb: "A remodel, install, or before-and-after job.",
    urlPlaceholder: null,
    titlePlaceholder: "Master bathroom remodel — tile and vanity",
    detailPlaceholder:
      "What the space looked like before, what you did, materials used, how long it took, service area.",
    angle:
      "Show the craft. Open on the before condition, name the real problem you solved, show the finish, close with the service area you cover.",
    disclosureRule: "none",
  },
  {
    id: "restaurant",
    label: "Restaurant / food",
    subject: "menu item",
    icon: UtensilsCrossed,
    blurb: "A dish, special, or new menu drop.",
    urlPlaceholder: null,
    titlePlaceholder: "Sunday brisket special",
    detailPlaceholder: "What's in it, how it's made, price, when it's available, where you are.",
    angle:
      "Appetite first. Sound and texture beat adjectives — the sear, the pour, the pull. End with when it's served and where to find you.",
    disclosureRule: "none",
  },
  {
    id: "local_service",
    label: "Local service business",
    subject: "service",
    icon: Wrench,
    blurb: "Detailing, cleaning, landscaping, repair, salon.",
    urlPlaceholder: null,
    titlePlaceholder: "Full interior detail — daily driver",
    detailPlaceholder: "What the service includes, typical turnaround, price range, service area.",
    angle:
      "Satisfying process shot plus one honest reason to book. Name the neighborhood or radius you actually serve.",
    disclosureRule: "none",
  },
  {
    id: "professional",
    label: "Professional practice",
    subject: "offer",
    icon: Briefcase,
    blurb: "Legal, accounting, insurance, consulting, coaching.",
    urlPlaceholder: "https://yourfirm.com/services/...",
    titlePlaceholder: "Small-business bookkeeping cleanup",
    detailPlaceholder: "Who it's for, what it covers, how engagements start, your credentials.",
    angle:
      "Answer one real question a prospective client asks. Educational, no guarantees of outcome, no claims about results you cannot show.",
    disclosureRule: "none",
  },
  {
    id: "saas_app",
    label: "App or SaaS",
    subject: "product",
    icon: MonitorSmartphone,
    blurb: "A launch, feature, or onboarding walkthrough.",
    urlPlaceholder: "https://yourapp.com",
    titlePlaceholder: "Team inbox — shared triage",
    detailPlaceholder: "What the product does, the job it replaces, pricing, who it's built for.",
    angle:
      "Show the job being finished, not the feature list. One screen, one outcome, one reason to try it.",
    disclosureRule: "none",
  },
  {
    id: "ecommerce_brand",
    label: "Your own store",
    subject: "product",
    icon: ShoppingBag,
    blurb: "Products you own and ship yourself.",
    urlPlaceholder: "https://yourstore.com/products/...",
    titlePlaceholder: "Waxed canvas tote",
    detailPlaceholder: "Materials, sizing, price, shipping, what makes it different.",
    angle:
      "Founder-voice product story. Why it exists, the detail people notice in person, how to get it.",
    disclosureRule: "none",
  },
];

export const DEFAULT_CAMPAIGN_MODE: CampaignModeId = "affiliate";

export const CAMPAIGN_MODE_IDS = CAMPAIGN_MODES.map((m) => m.id) as [
  CampaignModeId,
  ...CampaignModeId[],
];

export function campaignMode(id: string | null | undefined): CampaignMode {
  return CAMPAIGN_MODES.find((m) => m.id === id) ?? CAMPAIGN_MODES[0]!;
}
