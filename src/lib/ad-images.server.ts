// Server-only helpers for the Ad Image Engine.

export type Ratio = "1:1" | "9:16" | "16:9";

export const RATIO_SIZE: Record<Ratio, string> = {
  "1:1": "1024x1024",
  "9:16": "1024x1536",
  "16:9": "1536x1024",
};

const SURFACE: Record<Ratio, string> = {
  "1:1":
    "Facebook/Instagram feed square. Centered hero composition, product clearly readable at thumbnail size.",
  "9:16":
    "TikTok / Reels / Stories vertical. Keep the top 15% and bottom 20% visually clear for platform UI; subject centered in the safe zone.",
  "16:9":
    "Facebook display / Audience Network landscape. Product left-of-center with clean negative space to the right.",
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

/** AdsCreator prompt logic: product DNA + creator DNA + surface-native composition + policy guardrails. */
export function buildAdPrompt(
  product: ProductLike,
  ratio: Ratio,
  persona: CreatorDna | null,
  angle?: string,
): string {
  const priceLine =
    product.price && product.price.trim()
      ? `Price point: ${product.price} ${product.currency ?? ""}`.trim()
      : "Price point: mid-market";
  const dna = persona
    ? `Creator vibe to match: ${persona.vibe ?? "energetic"}, tone ${persona.voice_tone ?? "warm"}.`
    : "Creator vibe to match: warm, upbeat, everyday-creator energy.";
  return [
    `High-converting social ad creative for this product: ${product.title}.`,
    product.description ? `What it is: ${product.description}` : "",
    priceLine,
    product.source_domain ? `Sold via ${product.source_domain}.` : "",
    angle ? `Selling angle: ${angle}.` : "",
    dna,
    `Format: ${SURFACE[ratio]}`,
    "Style: photoreal lifestyle product photography, natural light, shallow depth of field, tactile real-world surfaces, colors pulled from the product's own palette. Looks shot on a phone by a real creator, not a stock studio render.",
    "Hard rules: no real or recognizable people's faces, no celebrity likenesses, no brand logos, no watermarks, no UI chrome, no fake review stars or rating badges, no before/after claims. If any text appears at all, at most four words, spelled exactly right, no personal-attribute call-outs.",
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
