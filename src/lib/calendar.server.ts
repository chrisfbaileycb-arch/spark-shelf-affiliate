// Server-only prompt engineering for a single calendar day. Everything returned
// is derived from the slot the user already filled in — no invented metrics,
// testimonials, or results.
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "google/gemini-3.6-flash";

export const CALENDAR_PROMPT_MODEL = MODEL;

export interface DayPromptInput {
  plan_date: string;
  engine: string;
  platforms: string[];
  title: string;
  notes: string;
  product_title?: string | null;
  product_description?: string | null;
  product_price?: string | null;
  product_url?: string | null;
  creator_niche?: string | null;
  creator_tone?: string | null;
  /** Campaign mode id, e.g. "affiliate", "real_estate", "restaurant". */
  campaign_mode?: string | null;
  /** Human label for the mode, used verbatim in the prompt. */
  mode_label?: string | null;
  /** Mode-specific creative steer. */
  mode_angle?: string | null;
  /** Whether an FTC affiliate disclosure belongs on this post. */
  affiliate?: boolean;
}


export interface DayPromptOutput {
  hook: string;
  script: string;
  video_prompt: string;
  image_prompt: string;
  caption: string;
  hashtags: string[];
  disclosure: string;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function strArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
}

export async function generateDayPrompt(input: DayPromptInput): Promise<DayPromptOutput> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY is not configured.");

  const system = [
    "You write short-form affiliate content for one independent creator.",
    "Return strict JSON only.",
    "Never invent statistics, review counts, ratings, testimonials, earnings, or results.",
    "Never reference a real influencer, celebrity, or brand-owned character.",
    "Product claims must come only from the supplied product details.",
    "Meta and TikTok policy: no personal-attribute call-outs ('Do YOU struggle with...'), minimal on-screen text.",
    "Image prompts: if any text appears in the image, at most four words spelled exactly right; no logos, watermarks, or AI artifacts.",
    "Fields: hook (<=12 words), script (spoken words only, 15-30 seconds, no stage directions),",
    "video_prompt (one visual generation prompt describing scene, motion, lighting, framing for a 9:16 clip),",
    "image_prompt (one still-creative prompt usable across 9:16, 1:1 and 16:9),",
    "caption (platform-ready, under 150 characters), hashtags (exactly 2: one broad, one specific, with #),",
    "disclosure (a short FTC affiliate disclosure line).",
  ].join(" ");

  const user = JSON.stringify({
    posting_date: input.plan_date,
    engine: input.engine,
    platforms: input.platforms,
    slot_title: input.title,
    creator_notes: input.notes,
    product: {
      title: input.product_title ?? null,
      description: input.product_description ?? null,
      price: input.product_price ?? null,
      url: input.product_url ?? null,
    },
    creator: { niche: input.creator_niche ?? null, tone: input.creator_tone ?? null },
  });

  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 402) throw new Error("Lovable AI credits exhausted.");
    if (res.status === 429) throw new Error("AI rate limit — try again in a moment.");
    throw new Error(`AI request failed (${res.status}).`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
  } catch {
    throw new Error("The model did not return usable JSON. Try again.");
  }

  const hashtags = strArray(raw["hashtags"], 2).map((h) => (h.startsWith("#") ? h : `#${h}`));

  return {
    hook: str(raw["hook"]),
    script: str(raw["script"]),
    video_prompt: str(raw["video_prompt"]),
    image_prompt: str(raw["image_prompt"]),
    caption: str(raw["caption"]),
    hashtags,
    disclosure: str(raw["disclosure"], "#ad — commissionable link"),
  };
}
