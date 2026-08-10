import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GenerateInput = z.object({
  product_id: z.string().uuid(),
  persona_id: z.string().uuid().optional(),
  duration_seconds: z.union([z.literal(15), z.literal(30)]).default(15),
});

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";


interface ScriptOut {
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
}

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
  durationSeconds = 15,
): Promise<ScriptOut> {
  const personaBlock = persona
    ? `You ARE ${persona.name}. Vibe: ${persona.vibe ?? "energetic"}. Voice tone: ${persona.voice_tone ?? "warm"}. Bio: ${persona.bio ?? ""}. Speech quirks: ${persona.speech_quirks ?? ""}. Naturally weave in 1 of these catchphrases if it fits: ${Array.isArray(persona.catchphrases) ? (persona.catchphrases as string[]).join(" | ") : ""}.`
    : "You are a 25-year-old female lifestyle influencer.";
  const content = await aiJson({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content: `${personaBlock} You write punchy ${durationSeconds}-second short-form scripts for affiliate and product marketing. Tone: warm, excited, conversational, zero corporate. Open with a strong scroll-stopping hook. End with a clear "link in bio" CTA. Reply ONLY with strict JSON: {hook, script, caption, hashtags[]}. The combined hook + script must be ${durationSeconds === 30 ? "72-84" : "35-42"} spoken words (≈${durationSeconds}s at normal pace). caption: 1-2 sentences then a blank line then exactly the 2 hashtags prefixed with #. hashtags: EXACTLY 2 entries — the two highest-intent, most discoverable tags for this product/niche (one broad niche tag + one specific product/trend tag). lowercase, no #, no spaces.`,
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
    // Ensure caption ends with the 2 hashtags
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
    throw new Error("AI returned malformed script JSON");
  }
}

/** Provider status: MiniMax has no public balance endpoint, so we report reachability. */
export const checkVideoProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const configured = Boolean(process.env["MINIMAX_API_KEY"]);
    return { provider: "minimax" as const, configured, low: !configured };
  });


export const generateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error: pe } = await supabase
      .from("products")
      .select("*")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pe || !product) throw new Error("Product not found");

    // Resolve persona: explicit pick, else user's default, else null (fallback baked into script prompt).
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
    if (data.persona_id) {
      const { data: p } = await supabase
        .from("personas")
        .select(
          "id,name,bio,vibe,voice_tone,catchphrases,speech_quirks,heygen_avatar_id,elevenlabs_voice_id",
        )
        .eq("id", data.persona_id)
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

    // Legacy avatar/voice columns are kept for persona bookkeeping; MiniMax renders from prompt.
    const avatarId = persona?.heygen_avatar_id ?? null;
    const voiceId = persona?.elevenlabs_voice_id ?? null;


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PLAN_REQUIRED_MESSAGE } = await import("@/lib/plans");

    // Platform spend guardrails: kill switch + daily global and per-user render caps.
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("generation_enabled, daily_global_video_cap, per_user_daily_video_cap, pause_reason")
      .eq("id", true)
      .maybeSingle();
    if (settings && !settings.generation_enabled) {
      throw new Error(
        settings.pause_reason ||
          "Video generation is temporarily paused for maintenance. Please try again shortly.",
      );
    }
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const since = dayStart.toISOString();
    const [{ count: globalToday }, { count: userToday }] = await Promise.all([
      supabaseAdmin
        .from("videos")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      supabaseAdmin
        .from("videos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", since),
    ]);
    if (settings && (globalToday ?? 0) >= settings.daily_global_video_cap) {
      throw new Error(
        "We've hit today's platform-wide rendering limit. Your quota is safe — try again tomorrow.",
      );
    }
    if (settings && (userToday ?? 0) >= settings.per_user_daily_video_cap) {
      throw new Error(
        `Daily limit reached (${settings.per_user_daily_video_cap} videos/day). Your monthly quota is untouched — try again tomorrow.`,
      );
    }

    // Quota check & decrement BEFORE doing any expensive work.
    const { data: quotaResult, error: qErr } = await supabaseAdmin.rpc("consume_video_quota", {
      _user_id: userId,
    });

    if (qErr) throw new Error(qErr.message);
    const qr = quotaResult as {
      ok: boolean;
      reason?: string;
      tier?: string;
      used?: number;
      limit?: number;
    } | null;
    if (!qr?.ok) {
      const reason = qr?.reason ?? "unknown";
      if (reason === "plan_required" || reason === "trial_exhausted" || reason === "no_subscription")
        throw new Error(PLAN_REQUIRED_MESSAGE);
      if (reason === "quota_exceeded")
        throw new Error(
          `Monthly limit reached (${qr?.used}/${qr?.limit}). Upgrade or wait until next billing period.`,
        );
      if (reason === "subscription_inactive")
        throw new Error("Your subscription is inactive. Update billing to continue.");
      throw new Error(`Cannot generate: ${reason}`);
    }

    if (!process.env["MINIMAX_API_KEY"]) {
      const { data: lc } = await supabase
        .from("videos")
        .insert({
          user_id: userId,
          product_id: product.id,
          persona_id: persona?.id ?? null,
          voice_id: voiceId,
          heygen_avatar_id: avatarId,
          provider: "minimax",
          status: "low_credit",
          duration_seconds: data.duration_seconds,
          error: "MINIMAX_API_KEY is not configured on the server.",
        })
        .select()
        .single();
      throw new Error(
        `Video provider not configured (MINIMAX_API_KEY missing). Video record: ${lc?.id ?? "n/a"}`,
      );
    }

    const { data: video, error: ve } = await supabase
      .from("videos")
      .insert({
        user_id: userId,
        product_id: product.id,
        persona_id: persona?.id ?? null,
        voice_id: voiceId,
        heygen_avatar_id: avatarId,
        provider: "minimax",
        status: "scripting",
        duration_seconds: data.duration_seconds,
      })
      .select()
      .single();
    if (ve || !video) throw new Error(ve?.message ?? "video insert failed");

    const patch = async (fields: Record<string, unknown>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("videos") as any).update(fields).eq("id", video.id);

    try {
      const script = await generateScript(product, persona, data.duration_seconds);
      await patch({
        status: "rendering",
        hook: script.hook,
        script: script.script,
        caption: script.caption,
        hashtags: script.hashtags,
      });

      const {
        buildVideoPrompt,
        createVideoTask,
        pollVideoTask,
        retrieveFileUrl,
        minimaxClipSeconds,
      } = await import("@/lib/minimax.server");

      const clipSeconds = minimaxClipSeconds(data.duration_seconds);
      const prompt = buildVideoPrompt({
        hook: script.hook,
        script: script.script,
        productTitle: product.title,
        productDescription: product.description,
        personaVibe: persona?.vibe ?? null,
      });

      const taskId = await createVideoTask({
        prompt,
        durationSeconds: clipSeconds,
        firstFrameImage: Array.isArray(product.images)
          ? ((product.images as unknown[]).find(
              (u) => typeof u === "string" && u.startsWith("https://"),
            ) as string | undefined) ?? null
          : null,

      });
      await patch({ heygen_video_id: taskId });

      const fileId = await pollVideoTask(taskId);
      const videoUrl = await retrieveFileUrl(fileId);

      await patch({
        status: "ready",
        video_url: videoUrl,
        duration_seconds: clipSeconds,
        error: null,
      });

      return { video_id: video.id, provider_task_id: taskId };

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await patch({ status: "failed", error: message });
      throw err;
    }
  });

export const listVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("videos")
      .select(
        "id, hook, status, thumbnail_url, created_at, product_id, generation_cost, products(title, source_domain)",
      )
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getVideoBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: video, error } = await supabase
      .from("videos")
      .select("*, products(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!video) throw new Error("Video not found");
    return { video };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
