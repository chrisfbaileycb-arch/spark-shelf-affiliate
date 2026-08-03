import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

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
  name: "generate_script",
  title: "Generate affiliate script",
  description:
    "Generate a 15-second influencer script, caption, and hashtags for a product without rendering a video.",
  inputSchema: {
    product_id: z.string().uuid().describe("UUID of the product to script for."),
    persona_id: z
      .string()
      .uuid()
      .optional()
      .describe("Optional persona ID; uses default persona if omitted."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ product_id, persona_id }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("You must be signed in to generate a script.");
    const supabase = supabaseForUser(ctx);

    const { data: product, error: pe } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .maybeSingle();
    if (pe) throw new ToolError(`Database error: ${pe.message}`);
    if (!product) throw new ToolError("Product not found.");

    let persona: {
      name: string;
      bio: string | null;
      vibe: string | null;
      voice_tone: string | null;
      catchphrases: unknown;
      speech_quirks: string | null;
    } | null = null;
    if (persona_id) {
      const { data: p } = await supabase
        .from("personas")
        .select("name,bio,vibe,voice_tone,catchphrases,speech_quirks")
        .eq("id", persona_id)
        .maybeSingle();
      persona = p;
    }
    if (!persona) {
      const { data: p } = await supabase
        .from("personas")
        .select("name,bio,vibe,voice_tone,catchphrases,speech_quirks")
        .eq("is_default", true)
        .maybeSingle();
      persona = p;
    }

    const script = await generateScript(product, persona);
    return {
      content: [
        { type: "text", text: `Hook: ${script.hook}` },
        { type: "text", text: `Script: ${script.script}` },
        { type: "text", text: `Caption:\n${script.caption}` },
        { type: "text", text: `Hashtags: ${script.hashtags.map((h) => `#${h}`).join(" ")}` },
      ],
    };
  },
});
