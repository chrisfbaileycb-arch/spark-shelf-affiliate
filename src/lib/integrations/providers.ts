/**
 * Single extensible provider catalog. One model, no provider-specific tables.
 * `availability` is the source of truth for what the server will accept as an
 * active outbound provider — the UI reads the same list.
 */
export type OutboundProviderId = "apollo" | "instantly" | "lemlist" | "saleshandy" | "clay" | "snov";

export type ProviderAvailability = "active" | "beta";

export interface OutboundProvider {
  id: OutboundProviderId;
  name: string;
  availability: ProviderAvailability;
  group: string;
  tagline: string;
  description: string;
  /** What the customer must have before the credential is useful. */
  requirements: string[];
  credentialLabel: string;
  credentialHelp: string;
  docsUrl: string;
}

export const OUTBOUND_PROVIDERS: OutboundProvider[] = [
  {
    id: "apollo",
    name: "Apollo.io",
    availability: "active",
    group: "Active providers",
    tagline: "Sourcing, enrichment, and sending on your own Apollo account.",
    description:
      "Default provider. Echo Your Influence sources and qualifies leads, writes the sequences, and orchestrates the schedule. Data credits and mailbox sending stay on your Apollo plan.",
    requirements: [
      "An active Apollo.io plan with API access.",
      "An API key with search and sequence permissions (some endpoints require a master key).",
      "A connected sending mailbox inside Apollo.",
    ],
    credentialLabel: "Apollo API key",
    credentialHelp: "Apollo → Settings → Integrations → API. Paste the key once; we encrypt it.",
    docsUrl: "https://docs.apollo.io/",
  },
  {
    id: "instantly",
    name: "Instantly.ai",
    availability: "active",
    group: "Active providers",
    tagline: "High-volume sending with your own warmed mailboxes.",
    description:
      "Use Instantly as the sending and sequencing layer. Echo Your Influence supplies the strategy, copy, and schedule; deliverability and mailbox rotation run on your Instantly workspace.",
    requirements: [
      "An Instantly.ai plan that includes API access.",
      "At least one warmed sending mailbox connected in Instantly.",
      "A workspace API key.",
    ],
    credentialLabel: "Instantly API key",
    credentialHelp: "Instantly → Settings → Integrations → API key.",
    docsUrl: "https://developer.instantly.ai/",
  },
  {
    id: "lemlist",
    name: "Lemlist",
    availability: "beta",
    group: "Sequencing — beta",
    tagline: "Multichannel sequencing with image and video personalization.",
    description:
      "Interface reserved. No active handler is wired yet, so Lemlist cannot run campaigns.",
    requirements: ["Roadmap — not available for active campaigns."],
    credentialLabel: "Lemlist API key",
    credentialHelp: "Not accepted while this provider is in development.",
    docsUrl: "https://developer.lemlist.com/",
  },
  {
    id: "saleshandy",
    name: "Saleshandy",
    availability: "beta",
    group: "Sequencing — beta",
    tagline: "Cold email sequencing with unified inbox.",
    description:
      "Interface reserved. No active handler is wired yet, so Saleshandy cannot run campaigns.",
    requirements: ["Roadmap — not available for active campaigns."],
    credentialLabel: "Saleshandy API key",
    credentialHelp: "Not accepted while this provider is in development.",
    docsUrl: "https://developers.saleshandy.com/",
  },
  {
    id: "clay",
    name: "Clay",
    availability: "beta",
    group: "Data & enrichment — beta",
    tagline: "Waterfall enrichment across many data vendors.",
    description:
      "Interface reserved. No active handler is wired yet, so Clay cannot run campaigns.",
    requirements: ["Roadmap — not available for active campaigns."],
    credentialLabel: "Clay API key",
    credentialHelp: "Not accepted while this provider is in development.",
    docsUrl: "https://www.clay.com/",
  },
  {
    id: "snov",
    name: "Snov.io",
    availability: "beta",
    group: "Data & enrichment — beta",
    tagline: "Email finding, verification, and drip campaigns.",
    description:
      "Interface reserved. No active handler is wired yet, so Snov.io cannot run campaigns.",
    requirements: ["Roadmap — not available for active campaigns."],
    credentialLabel: "Snov.io API key",
    credentialHelp: "Not accepted while this provider is in development.",
    docsUrl: "https://snov.io/api",
  },
];

export const OUTBOUND_PROVIDER_IDS = OUTBOUND_PROVIDERS.map((p) => p.id);

export const ACTIVE_OUTBOUND_PROVIDER_IDS = OUTBOUND_PROVIDERS.filter(
  (p) => p.availability === "active",
).map((p) => p.id);

export function getOutboundProvider(id: string): OutboundProvider | undefined {
  return OUTBOUND_PROVIDERS.find((p) => p.id === id);
}

export function isActiveOutboundProvider(id: string): boolean {
  return getOutboundProvider(id)?.availability === "active";
}

/** Social platforms surfaced in the Social Connections screen. */
export const SOCIAL_PLATFORMS = [
  { id: "tiktok", name: "TikTok", note: "Vertical video. Direct post or draft upload." },
  { id: "instagram", name: "Instagram Reels", note: "Requires a professional account." },
  { id: "youtube", name: "YouTube Shorts", note: "Authorized uploads via the channel owner." },
  { id: "linkedin", name: "LinkedIn", note: "Personal profile or company page." },
  { id: "x", name: "X", note: "Posting limits depend on the account's API tier." },
  { id: "facebook", name: "Facebook", note: "Pages only, via a linked Meta account." },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];
