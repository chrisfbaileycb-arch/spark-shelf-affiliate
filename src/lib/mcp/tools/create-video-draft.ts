import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const DEFAULT_AVATAR = "Daisy-inskirt-20220818";
const DEFAULT_VOICE = "2d5b0e6cf36f460aa7fc47e3eee4ba54";

interface ScriptOut {
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
}

async function aiJson(body: Record<string, unknown>): Promise<string> {
  const key = (() => {
    const runtime = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    };
    return runtime.process?.env?.LOVABLE_API_KEY;
  })();
  if (!key) throw new ToolError("LOVABLE_API_KEY not configured.");
  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 402) throw new ToolError("Lovable AI credits exhausted.");
    if (res.status === 429) throw new ToolError("AI rate limit.");
    throw new ToolError(`AI request failed (${res.status})`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

async function generateScript(
  product: {
    title: string;
    description: string | null;
    price: string | null;
    currency: string | null;
  },
  persona: {
    name: string;
    bio: string | null;
    vibe: string | null;
    voice_tone: string | null;
    catchphrases: unknown;
    speech_quirks: string | null;
  } | null,
): Promise<ScriptOut> {
  const personaBlock = persona
    ? `You ARE ${persona.name}. Vibe: ${persona.vibe ?? "energetic"}. Voice tone: ${persona.voice_tone ?? "warm"}. Bio: ${persona.bio ?? ""}. Speech quirks: ${persona.speech_quirks ?? ""}. Naturally weave in 1 of these catchphrases if it fits: ${Array.isArray(persona.catchphrases) ? (persona.catchphrases as string[]).join(" | ") : ""}.`
    : "You are a 25-year-old female lifestyle influencer.";
  const content = await aiJson({
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "system",
        content: `${personaBlock} You write punchy 15-second short-form scripts for affiliate marketing. Tone: warm, excited, conversational, zero corporate. Open with a strong scroll-stopping hook. End with a clear "link in bio" CTA. Reply ONLY with strict JSON: {hook, script, caption, hashtags[]}. The combined hook + script must be 35-42 spoken words (≈15s at normal pace). caption: 1-2 sentences then a blank line then exactly the 2 hashtags prefixed with #. hashtags: EXACTLY 2 entries — the two highest-intent, most discoverable tags for this product/niche (one broad niche tag + one specific product/trend tag). lowercase, no #, no spaces.`,
      },
      {
        role: "user",
        content: `Product: ${product.title}\nDescription: ${product.description ?? ""}\nPrice: ${product.price ?? ""} ${product.currency ?? ""}`,
      },
    ],
    response_format: { type: "json_object" },
  });
  try {
    const parsed = JSON.parse(content);
    const rawTags = Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [];
    const hashtags = rawTags
      .map((t: string) => t.replace(/^#/, "").replace(/\s+/g, "").toLowerCase())
      .filter(Boolean)
      .slice(0, 2);
    let caption = String(parsed.caption ?? "");
    if (hashtags.length) {
      const tagLine = hashtags.map((h: string) => `#${h}`).join(" ");
      const stripped = caption.replace(/(\s*#[\w]+)+\s*$/g, "").trimEnd();
      caption = `${stripped}\n\n${tagLine}`;
    }
    return {
      hook: String(parsed.hook ?? ""),
      script: String(parsed.script ?? ""),
      caption,
      hashtags,
    };
  } catch {
    throw new ToolError("AI returned malformed script JSON");
  }
}

export default defineTool({
  name: "create_video_draft",
  title: "Create video draft",
  description:
    "Generate a script and save an avatar video draft record. The actual HeyGen render must be triggered from the Influencer Echo web app because rendering takes several minutes.",
  inputSchema: {
    product_id: z.string().uuid().describe("UUID of the product to create a video for."),
    persona_id: z
      .string()
      .uuid()
      .optional()
      .describe("Optional persona ID; uses default persona if omitted."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ product_id, persona_id }, ctx) => {
    if (!ctx.isAuthenticated())
      throw new ToolError("You must be signed in to create a video draft.");
    const supabase = supabaseForUser(ctx);

    const { data: product, error: pe } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .maybeSingle();
    if (pe) throw new ToolError(`Database error: ${pe.message}`);
    if (!product) throw new ToolError("Product not found.");

    let persona: {
      id: string;
      name: string;
      bio: string | null;
      vibe: string | null;
      voice_tone: string | null;
      catchphrases: unknown;
      speech_quirks: string | null;
      heygen_avatar_id: string | null;
      elevenlabs_voice_id: string | null;
    } | null = null;
    if (persona_id) {
      const { data: p } = await supabase
        .from("personas")
        .select(
          "id,name,bio,vibe,voice_tone,catchphrases,speech_quirks,heygen_avatar_id,elevenlabs_voice_id",
        )
        .eq("id", persona_id)
        .maybeSingle();
      persona = p;
    }
    if (!persona) {
      const { data: p } = await supabase
        .from("personas")
        .select(
          "id,name,bio,vibe,voice_tone,catchphrases,speech_quirks,heygen_avatar_id,elevenlabs_voice_id",
        )
        .eq("is_default", true)
        .maybeSingle();
      persona = p;
    }

    const script = await generateScript(product, persona);
    const avatarId = persona?.heygen_avatar_id || DEFAULT_AVATAR;
    const voiceId = persona?.elevenlabs_voice_id || DEFAULT_VOICE;

    const { data: video, error: ve } = await supabase
      .from("videos")
      .insert({
        user_id: ctx.getUserId(),
        product_id: product.id,
        persona_id: persona?.id ?? null,
        voice_id: voiceId,
        heygen_avatar_id: avatarId,
        provider: "heygen",
        video_kind: "avatar",
        status: "scripting",
        duration_seconds: 15,
        hook: script.hook,
        script: script.script,
        caption: script.caption,
        hashtags: script.hashtags,
      })
      .select()
      .single();
    if (ve || !video) throw new ToolError(ve?.message ?? "Failed to save video draft.");

    return {
      content: [
        {
          type: "text",
          text: `Created video draft ${video.id}. Open the Influencer Echo app and click "Render" to send it to HeyGen.`,
        },
        {
          type: "text",
          text: JSON.stringify(
            {
              video_id: video.id,
              hook: script.hook,
              script: script.script,
              caption: script.caption,
              hashtags: script.hashtags,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
});
