import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GenerateInput = z.object({
  product_id: z.string().uuid(),
  persona_id: z.string().uuid().optional(),
  duration_seconds: z.union([z.literal(15), z.literal(30)]).default(15),
});

const BRollInput = z.object({
  product_id: z.string().uuid(),
  duration_seconds: z.union([z.literal(6), z.literal(10)]).default(6),
  style_note: z.string().max(400).optional(),
});

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const HEYGEN_API = "https://api.heygen.com";
// Sensible defaults — overridable per persona.
const DEFAULT_AVATAR = "Daisy-inskirt-20220818";
const DEFAULT_VOICE = "2d5b0e6cf36f460aa7fc47e3eee4ba54";
const MIN_CREDITS = 30; // ~30s of avatar video; below this we flag low_credit

interface ScriptOut {
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
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

/* ------------------------------------------------------------------ */
/* Primary engine: HeyGen avatar talking-head                          */
/* ------------------------------------------------------------------ */

async function heygen<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env["HEYGEN_API_KEY"];
  if (!key) throw new Error("HEYGEN_API_KEY not configured");
  const res = await fetch(`${HEYGEN_API}${path}`, {
    ...init,
    headers: {
      "X-Api-Key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HeyGen ${path} ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`HeyGen returned non-JSON from ${path}`);
  }
}

interface HeyGenQuota {
  error: unknown;
  data?: { remaining_quota?: number };
}
interface HeyGenGenerateResp {
  error: unknown;
  data?: { video_id?: string };
}
interface HeyGenStatusResp {
  code: number;
  data?: {
    status: "pending" | "processing" | "completed" | "failed" | "waiting";
    video_url?: string;
    thumbnail_url?: string;
    error?: { detail?: string; message?: string } | null;
    duration?: number;
    credit_used?: number;
  };
}

async function pollHeygen(videoId: string): Promise<NonNullable<HeyGenStatusResp["data"]>> {
  const start = Date.now();
  const timeout = 5 * 60 * 1000;
  while (Date.now() - start < timeout) {
    const r = await heygen<HeyGenStatusResp>(
      `/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
    );
    const d = r.data;
    if (!d) throw new Error("HeyGen status missing data");
    if (d.status === "completed") return d;
    if (d.status === "failed")
      throw new Error(d.error?.message || d.error?.detail || "HeyGen reported failure");
    await new Promise((res) => setTimeout(res, 6000));
  }
  throw new Error("HeyGen render timed out after 5 minutes");
}

/** Status of both engines: HeyGen avatar credits + MiniMax b-roll availability. */
export const checkVideoProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    let avatarRemaining: number | null = null;
    let avatarError: string | null = null;
    try {
      const json = await heygen<HeyGenQuota>("/v2/user/remaining_quota");
      avatarRemaining = json.data?.remaining_quota ?? 0;
    } catch (e) {
      avatarError = e instanceof Error ? e.message : String(e);
    }
    return {
      avatar: {
        provider: "heygen" as const,
        configured: Boolean(process.env["HEYGEN_API_KEY"]),
        remaining: avatarRemaining,
        low: avatarRemaining !== null && avatarRemaining < MIN_CREDITS,
        threshold: MIN_CREDITS,
        error: avatarError,
      },
      broll: {
        provider: "minimax" as const,
        configured: Boolean(process.env["MINIMAX_API_KEY"]),
      },
    };
  });

/** Shared spend guardrails: kill switch + daily caps. */
async function assertRenderAllowed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  userId: string,
  kind: "avatar" | "broll",
) {
  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select(
      "generation_enabled, daily_global_video_cap, per_user_daily_video_cap, per_user_daily_broll_cap, pause_reason",
    )
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
    supabaseAdmin.from("videos").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabaseAdmin
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("video_kind", kind)
      .gte("created_at", since),
  ]);
  if (settings && (globalToday ?? 0) >= settings.daily_global_video_cap) {
    throw new Error(
      "We've hit today's platform-wide rendering limit. Your quota is safe — try again tomorrow.",
    );
  }
  const userCap =
    kind === "broll"
      ? (settings?.per_user_daily_broll_cap ?? 20)
      : (settings?.per_user_daily_video_cap ?? 10);
  if (settings && (userToday ?? 0) >= userCap) {
    throw new Error(
      `Daily limit reached (${userCap} ${kind === "broll" ? "b-roll clips" : "avatar videos"}/day). Your monthly quota is untouched — try again tomorrow.`,
    );
  }
}

function quotaError(
  qr: { ok: boolean; reason?: string; used?: number; limit?: number } | null,
  planRequiredMessage: string,
) {
  const reason = qr?.reason ?? "unknown";
  if (reason === "plan_required" || reason === "trial_exhausted" || reason === "no_subscription")
    return new Error(planRequiredMessage);
  if (reason === "quota_exceeded")
    return new Error(
      `Monthly limit reached (${qr?.used}/${qr?.limit}). Upgrade or wait until next billing period.`,
    );
  if (reason === "subscription_inactive")
    return new Error("Your subscription is inactive. Update billing to continue.");
  return new Error(`Cannot generate: ${reason}`);
}

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
    const personaCols =
      "id,name,bio,vibe,voice_tone,catchphrases,speech_quirks,heygen_avatar_id,elevenlabs_voice_id";
    if (data.persona_id) {
      const { data: p } = await supabase
        .from("personas")
        .select(personaCols)
        .eq("id", data.persona_id)
        .maybeSingle();
      persona = p;
    }
    if (!persona) {
      const { data: p } = await supabase
        .from("personas")
        .select(personaCols)
        .eq("is_default", true)
        .maybeSingle();
      persona = p;
    }

    const avatarId = persona?.heygen_avatar_id || DEFAULT_AVATAR;
    const voiceId = persona?.elevenlabs_voice_id || DEFAULT_VOICE;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PLAN_REQUIRED_MESSAGE } = await import("@/lib/plans");

    await assertRenderAllowed(supabaseAdmin, userId, "avatar");

    const { data: quotaResult, error: qErr } = await supabaseAdmin.rpc("consume_video_quota", {
      _user_id: userId,
    });
    if (qErr) throw new Error(qErr.message);
    const qr = quotaResult as {
      ok: boolean;
      reason?: string;
      used?: number;
      limit?: number;
    } | null;
    if (!qr?.ok) throw quotaError(qr, PLAN_REQUIRED_MESSAGE);

    // HeyGen balance check before spending anything.
    const quota = await heygen<HeyGenQuota>("/v2/user/remaining_quota");
    const remaining = quota.data?.remaining_quota ?? 0;
    if (remaining < MIN_CREDITS) {
      const { data: lc } = await supabase
        .from("videos")
        .insert({
          user_id: userId,
          product_id: product.id,
          persona_id: persona?.id ?? null,
          voice_id: voiceId,
          heygen_avatar_id: avatarId,
          provider: "heygen",
          video_kind: "avatar",
          status: "low_credit",
          duration_seconds: data.duration_seconds,
          error: `HeyGen balance ${remaining} credits is below threshold ${MIN_CREDITS}. Top up and retry.`,
        })
        .select()
        .single();
      throw new Error(
        `Low HeyGen credit: ${remaining} remaining (need ≥ ${MIN_CREDITS}). Video record: ${lc?.id ?? "n/a"}`,
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
        provider: "heygen",
        video_kind: "avatar",
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
      const spoken = `${script.hook} ${script.script}`.trim();
      await patch({
        status: "rendering",
        hook: script.hook,
        script: script.script,
        caption: script.caption,
        hashtags: script.hashtags,
      });

      const gen = await heygen<HeyGenGenerateResp>("/v2/video/generate", {
        method: "POST",
        body: JSON.stringify({
          video_inputs: [
            {
              character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
              voice: { type: "text", input_text: spoken, voice_id: voiceId, speed: 1.05 },
              background: { type: "color", value: "#FAF7F2" },
            },
          ],
          dimension: { width: 720, height: 1280 },
          caption: true,
        }),
      });
      const heygenVideoId = gen.data?.video_id;
      if (!heygenVideoId) throw new Error("HeyGen did not return a video_id");

      await patch({ heygen_video_id: heygenVideoId });

      const completed = await pollHeygen(heygenVideoId);
      if (!completed.video_url) throw new Error("HeyGen completed without a video_url");

      await patch({
        status: "ready",
        video_url: completed.video_url,
        thumbnail_url: completed.thumbnail_url ?? null,
        generation_cost: completed.credit_used ?? null,
        duration_seconds: Math.round(completed.duration ?? data.duration_seconds),
        error: null,
      });

      return { video_id: video.id, provider_task_id: heygenVideoId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await patch({ status: "failed", error: message });
      throw err;
    }
  });

/* ------------------------------------------------------------------ */
/* Secondary engine: MiniMax silent cinematic b-roll                    */
/* ------------------------------------------------------------------ */

export const generateBRollClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BRollInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error: pe } = await supabase
      .from("products")
      .select("*")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pe || !product) throw new Error("Product not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PLAN_REQUIRED_MESSAGE } = await import("@/lib/plans");

    if (!process.env["MINIMAX_API_KEY"])
      throw new Error("B-Roll studio is not configured (MINIMAX_API_KEY missing).");

    await assertRenderAllowed(supabaseAdmin, userId, "broll");

    const { data: quotaResult, error: qErr } = await supabaseAdmin.rpc("consume_broll_quota", {
      _user_id: userId,
    });
    if (qErr) throw new Error(qErr.message);
    const qr = quotaResult as {
      ok: boolean;
      reason?: string;
      used?: number;
      limit?: number;
    } | null;
    if (!qr?.ok) throw quotaError(qr, PLAN_REQUIRED_MESSAGE);

    const { data: video, error: ve } = await supabase
      .from("videos")
      .insert({
        user_id: userId,
        product_id: product.id,
        provider: "minimax",
        video_kind: "broll",
        status: "rendering",
        duration_seconds: data.duration_seconds,
      })
      .select()
      .single();
    if (ve || !video) throw new Error(ve?.message ?? "video insert failed");

    const patch = async (fields: Record<string, unknown>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("videos") as any).update(fields).eq("id", video.id);

    try {
      const { buildBRollPrompt, createVideoTask, pollVideoTask, retrieveFileUrl } = await import(
        "@/lib/minimax.server"
      );

      const prompt = buildBRollPrompt({
        productTitle: product.title,
        productDescription: product.description,
        assetKind: product.asset_kind,
        styleNote: data.style_note ?? null,
      });

      const firstFrame = Array.isArray(product.images)
        ? ((product.images as unknown[]).find(
            (u) => typeof u === "string" && u.startsWith("https://"),
          ) as string | undefined) ?? null
        : null;

      const taskId = await createVideoTask({
        prompt,
        durationSeconds: data.duration_seconds,
        firstFrameImage: firstFrame,
      });
      await patch({ heygen_video_id: taskId, script: prompt });

      const fileId = await pollVideoTask(taskId);
      const videoUrl = await retrieveFileUrl(fileId);

      await patch({
        status: "ready",
        video_url: videoUrl,
        duration_seconds: data.duration_seconds,
        error: null,
      });

      return { video_id: video.id, provider_task_id: taskId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await patch({ status: "failed", error: message });
      await supabaseAdmin.rpc("release_broll_quota", { _user_id: userId });
      throw err;
    }
  });

export const listVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("videos")
      .select(
        "id, hook, status, thumbnail_url, created_at, product_id, generation_cost, video_kind, provider, products(title, source_domain)",
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
