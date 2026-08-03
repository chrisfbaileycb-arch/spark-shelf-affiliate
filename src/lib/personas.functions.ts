import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GenerateInput = z.object({
  name: z.string().min(1).max(60),
  gender: z.enum(["female", "male", "nonbinary"]),
  age_range: z.enum(["18-24", "25-32", "33-45", "46-60"]),
  vibe: z.enum([
    "energetic-genz",
    "chill-millennial",
    "authoritative-expert",
    "warm-mom",
    "edgy-cool",
  ]),
  niche: z.enum([
    "lifestyle",
    "tech",
    "beauty",
    "fitness",
    "finance",
    "home",
    "fashion",
    "food",
    "parenting",
  ]),
  voice_tone: z.enum(["bubbly", "calm", "confident", "warm", "deadpan"]),
});

// Curated HeyGen avatar + ElevenLabs voice lookup. Picks the closest match.
function pickAvatarAndVoice(traits: z.infer<typeof GenerateInput>): {
  avatar: string;
  voice: string;
} {
  // Defaults — replace with your business library once HeyGen/EL accounts are swapped in.
  const female25Bubbly = {
    avatar: "Daisy-inskirt-20220818",
    voice: "2d5b0e6cf36f460aa7fc47e3eee4ba54",
  };
  const female25Calm = { avatar: "Daisy-inskirt-20220818", voice: "EXAVITQu4vr4xnSDxMaL" };
  const maleConfident = { avatar: "Tyler-incasualsuit-20220721", voice: "TX3LPaxmHKxFdv7VOQHJ" };
  const femaleWarm = { avatar: "Anna_public_3_20240108", voice: "XrExE9yKIg1WjnnlVkGX" };
  const maleAuthoritative = {
    avatar: "Tyler-incasualsuit-20220721",
    voice: "JBFqnCBsd6RMkjVDRZzb",
  };

  if (traits.gender === "male") {
    if (traits.vibe === "authoritative-expert") return maleAuthoritative;
    return maleConfident;
  }
  if (traits.vibe === "warm-mom") return femaleWarm;
  if (traits.voice_tone === "calm") return female25Calm;
  return female25Bubbly;
}

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

async function aiJson(body: Record<string, unknown>): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 402) throw new Error("Lovable AI credits exhausted.");
    if (res.status === 429) throw new Error("AI rate limit; try again in a moment.");
    throw new Error(`AI request failed (${res.status})`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

export const listPersonas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("personas")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const generatePersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const content = await aiJson({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Generate a TikTok influencer persona for affiliate marketing. Reply ONLY with strict JSON: {bio, catchphrases[], speech_quirks}. bio: 2 sentences in third person (~40 words). catchphrases: 4 short signature phrases (≤6 words each). speech_quirks: one sentence describing speech habits. No emojis.",
        },
        {
          role: "user",
          content: `Name: ${data.name}\nGender: ${data.gender}\nAge: ${data.age_range}\nVibe: ${data.vibe}\nNiche: ${data.niche}\nVoice tone: ${data.voice_tone}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    let bio = "",
      catchphrases: string[] = [],
      speech_quirks = "";
    try {
      const p = JSON.parse(content);
      bio = String(p.bio ?? "");
      catchphrases = Array.isArray(p.catchphrases) ? p.catchphrases.map(String).slice(0, 6) : [];
      speech_quirks = String(p.speech_quirks ?? "");
    } catch {
      throw new Error("AI returned malformed persona JSON");
    }

    const { avatar, voice } = pickAvatarAndVoice(data);

    const { data: inserted, error } = await supabase
      .from("personas")
      .insert({
        user_id: userId,
        name: data.name,
        bio,
        gender: data.gender,
        age_range: data.age_range,
        vibe: data.vibe,
        niche: data.niche,
        voice_tone: data.voice_tone,
        catchphrases,
        speech_quirks,
        heygen_avatar_id: avatar,
        elevenlabs_voice_id: voice,
        is_default: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const setDefaultPersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("personas").update({ is_default: false }).eq("user_id", userId);
    const { error } = await supabase
      .from("personas")
      .update({ is_default: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("personas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
