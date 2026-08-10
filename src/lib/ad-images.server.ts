// Server-only helpers for the Ad Image Engine.

export type Ratio = "1:1" | "9:16" | "16:9";
export type AssetKind = "ecommerce" | "mobile_app" | "saas";

export const RATIO_SIZE: Record<Ratio, string> = {
  "1:1": "1024x1024",
  "9:16": "1024x1536",
  "16:9": "1536x1024",
};

export const RATIO_LABEL: Record<Ratio, string> = {
  "1:1": "Feed",
  "9:16": "Stories / Reels",
  "16:9": "Landscape",
};

const SURFACE: Record<Ratio, string> = {
  "1:1":
    "Facebook/Instagram feed square. Centered hero composition, subject clearly readable at thumbnail size.",
  "9:16":
    "TikTok / Reels / Stories vertical. Keep the top 15% and bottom 20% visually clear for platform UI; subject centered in the safe zone.",
  "16:9":
    "Facebook display / Audience Network landscape. Subject left-of-center with clean negative space to the right.",
};

/** How the hero subject is staged for each kind of thing being advertised. */
const STAGING: Record<AssetKind, string> = {
  ecommerce:
    "Photoreal lifestyle product photography: the physical product held or placed in a real everyday setting, natural window light, shallow depth of field, tactile real-world surfaces. Looks shot on a phone by a real creator, not a stock studio render.",
  mobile_app:
    "A realistic modern smartphone mockup (clean bezel-less handset, subtle screen glare and drop shadow) held at a natural angle or floating on a soft gradient studio backdrop. The phone screen shows a plausible, uncluttered app interface matching the product's described purpose and color palette — legible cards, tabs and buttons, no lorem-ipsum gibberish, no fake data dashboards implying real results.",
  saas:
    "A realistic desktop browser-window mockup (rounded window chrome, neutral toolbar, soft drop shadow) floating on a clean gradient or workspace backdrop, optionally with a small companion phone mockup. The browser viewport shows a plausible, uncluttered web interface matching the product's described purpose and color palette — no fake metrics, no invented logos, no fabricated testimonials on screen.",
};

export interface ProductLike {
  title: string;
  description: string | null;
  price: string | null;
  currency: string | null;
  source_domain: string | null;
}

export interface CreatorDna {
  name: string;
  vibe: string | null;
  voice_tone: string | null;
  bio: string | null;
}

export interface PromptOptions {
  kind?: AssetKind;
  angle?: string;
  /** At most four words, burned into the creative as a headline. */
  overlay?: string;
}

/** AdsCreator prompt logic: product DNA + creator DNA + surface-native composition + policy guardrails. */
export function buildAdPrompt(
  product: ProductLike,
  ratio: Ratio,
  persona: CreatorDna | null,
  optionsOrAngle?: PromptOptions | string,
): string {
  const options: PromptOptions =
    typeof optionsOrAngle === "string" ? { angle: optionsOrAngle } : (optionsOrAngle ?? {});
  const kind: AssetKind = options.kind ?? "ecommerce";

  const priceLine =
    product.price && product.price.trim()
      ? `Price point: ${product.price} ${product.currency ?? ""}`.trim()
      : "Price point: mid-market";
  const dna = persona
    ? `Creator vibe to match: ${persona.vibe ?? "energetic"}, tone ${persona.voice_tone ?? "warm"}.`
    : "Creator vibe to match: warm, upbeat, everyday-creator energy.";

  const overlay = (options.overlay ?? "").trim();
  const overlayWords = overlay ? overlay.split(/\s+/).slice(0, 4).join(" ") : "";
  const overlayLine = overlayWords
    ? `Burn exactly this short headline into the composition, spelled exactly right, in a clean bold sans-serif with strong contrast, placed in the clear negative space and covering well under 20% of the frame: "${overlayWords}".`
    : "If any text appears at all, at most four words, spelled exactly right.";

  return [
    `High-converting social ad creative for: ${product.title}.`,
    product.description ? `What it is: ${product.description}` : "",
    priceLine,
    product.source_domain ? `Found at ${product.source_domain}.` : "",
    options.angle ? `Selling angle: ${options.angle}.` : "",
    dna,
    `Format: ${SURFACE[ratio]}`,
    `Staging: ${STAGING[kind]}`,
    overlayLine,
    "Hard rules: no real or recognizable people's faces, no celebrity likenesses, no real brand logos, no watermarks, no platform UI chrome, no fake review stars or rating badges, no invented statistics, no before/after claims, no personal-attribute call-outs.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Calls the Lovable AI Gateway images endpoint and returns raw PNG bytes. */
export async function renderAdImage(prompt: string, ratio: Ratio): Promise<Uint8Array> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt,
      size: RATIO_SIZE[ratio],
      quality: "low",
      n: 1,
    }),
  });
  if (!res.ok) {
    if (res.status === 402) throw new Error("AI credits exhausted — top up to keep generating.");
    if (res.status === 429) throw new Error("Rate limited — try again in a moment.");
    throw new Error(`Image generation failed (${res.status})`);
  }
  const json = (await res.json()) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(json.error?.message ?? "Image generation returned no image");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
