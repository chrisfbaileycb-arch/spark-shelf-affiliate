// Server-only helpers for the multi-format Campaign Kit engine.
import type { AssetKind } from "./ad-images.server";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

export interface ExtractedAsset {
  title: string;
  description: string;
  price: string;
  currency: string;
  image_urls: string[];
  angles: string[];
}

export interface AdCopy {
  headline: string;
  primary_text: string;
  description: string;
  overlay: string;
  angles: string[];
}

async function aiJson(body: Record<string, unknown>): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 402) throw new Error("Lovable AI credits exhausted.");
    if (res.status === 429) throw new Error("AI rate limit — try again in a moment.");
    throw new Error(`AI request failed (${res.status})`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "{}";
}

export async function scrapeSource(url: string): Promise<string> {
  const key = process.env["FIRECRAWL_API_KEY"];
  if (!key) throw new Error("Firecrawl is not connected");
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 1500 }),
  });
  if (!res.ok)
    throw new Error(`Scrape failed (${res.status}): ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { data?: { markdown?: string } };
  return json.data?.markdown ?? "";
}

const KIND_HINT: Record<AssetKind, string> = {
  ecommerce:
    "This is a physical or digital product for sale. price = the listed price if present. description = 1-2 sentence buyer-focused summary.",
  mobile_app:
    "This is a mobile app listing or app marketing page. price = the listed price or 'Free' / 'Free + IAP'. description = 1-2 sentences on what the app does for the user.",
  saas: "This is a SaaS product or website. price = the entry plan price if shown, else empty. description = 1-2 sentences on the core job the product does.",
};

export async function extractAsset(
  markdown: string,
  sourceUrl: string,
  kind: AssetKind,
): Promise<ExtractedAsset> {
  const content = await aiJson({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content: `Extract marketing facts from scraped page markdown. ${KIND_HINT[kind]} Reply ONLY with strict minified JSON: {title, description, price, currency, image_urls[], angles[]}. image_urls = up to 4 absolute https URLs of real product/app screenshots or photos (skip logos, avatars, sprites, tracking pixels). angles = 3 short selling angles (max 8 words each) drawn ONLY from claims actually on the page — never invent statistics, ratings, or testimonials. Unknown fields: empty string or [].`,
      },
      { role: "user", content: `Source URL: ${sourceUrl}\n\nMARKDOWN:\n${markdown.slice(0, 12000)}` },
    ],
    response_format: { type: "json_object" },
  });
  try {
    const p = JSON.parse(content) as Partial<ExtractedAsset>;
    return {
      title: String(p.title ?? "").trim() || "Untitled",
      description: String(p.description ?? ""),
      price: String(p.price ?? ""),
      currency: String(p.currency ?? ""),
      image_urls: Array.isArray(p.image_urls) ? p.image_urls.map(String).slice(0, 4) : [],
      angles: Array.isArray(p.angles) ? p.angles.map(String).slice(0, 3) : [],
    };
  } catch {
    throw new Error("AI returned malformed extraction JSON");
  }
}

/** Meta-compliant ad copy: primary text 125 visible chars, headline 40, description 30. */
export async function generateAdCopy(
  asset: { title: string; description: string; price: string; angles: string[] },
  kind: AssetKind,
): Promise<AdCopy> {
  const content = await aiJson({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content: `You write Facebook/Instagram ad copy. Reply ONLY with strict minified JSON: {headline, primary_text, description, overlay, angles[]}.
Hard limits: headline <= 40 characters. description <= 30 characters. primary_text <= 125 characters. overlay = at most FOUR words for burning onto the creative.
Rules: direct and concrete, no hype, no emoji spam. Never invent statistics, ratings, testimonials, user counts, or guarantees. No personal-attribute call-outs ("Do YOU struggle with..."). Claims must come only from the supplied facts. angles = 3 short alternate selling angles (max 8 words each).`,
      },
      {
        role: "user",
        content: `Kind: ${kind}\nName: ${asset.title}\nWhat it is: ${asset.description}\nPrice: ${asset.price}\nKnown angles: ${asset.angles.join(" | ")}`,
      },
    ],
    response_format: { type: "json_object" },
  });
  try {
    const p = JSON.parse(content) as Partial<AdCopy>;
    const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
    return {
      headline: clip(p.headline, 40),
      primary_text: clip(p.primary_text, 125),
      description: clip(p.description, 30),
      overlay: clip(p.overlay, 40).split(/\s+/).slice(0, 4).join(" "),
      angles: Array.isArray(p.angles) ? p.angles.map(String).slice(0, 3) : [],
    };
  } catch {
    throw new Error("AI returned malformed ad copy JSON");
  }
}
