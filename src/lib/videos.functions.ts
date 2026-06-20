import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GenerateInput = z.object({
  product_id: z.string().uuid(),
  avatar_id: z.string().optional(),
  voice_id: z.string().optional(),
});

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const HEYGEN_API = "https://api.heygen.com";
// Sensible defaults — overridable per-request from the UI.
const DEFAULT_AVATAR = "Daisy-inskirt-20220818";
const DEFAULT_VOICE = "2d5b0e6cf36f460aa7fc47e3eee4ba54";
const MIN_CREDITS = 30; // ~30s of video; below this we flag low_credit

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

async function generateScript(product: {
  title: string;
  description: string | null;
  price: string | null;
  currency: string | null;
}): Promise<ScriptOut> {
  const content = await aiJson({
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "system",
        content:
          "You write punchy 15-second TikTok scripts spoken by a 25-year-old female lifestyle influencer doing affiliate marketing. Tone: warm, excited, conversational, zero corporate. Open with a strong scroll-stopping hook. End with a clear 'link in bio' CTA. Reply ONLY with strict JSON: {hook, script, caption, hashtags[]}. The combined hook + script must be 35-42 spoken words (≈15s at normal pace). hashtags: 8 lowercase, no #.",
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
    return {
      hook: String(parsed.hook ?? ""),
      script: String(parsed.script ?? ""),
      caption: String(parsed.caption ?? ""),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 12) : [],
    };
  } catch {
    throw new Error("AI returned malformed script JSON");
  }
}

async function heygen<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.HEYGEN_API_KEY;
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

export const checkHeygenBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const json = await heygen<HeyGenQuota>("/v2/user/remaining_quota");
    const remaining = json.data?.remaining_quota ?? 0;
    return { remaining, low: remaining < MIN_CREDITS, threshold: MIN_CREDITS };
  });

interface HeyGenGenerateResp { error: unknown; data?: { video_id?: string } }
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

async function pollHeygen(videoId: string, signal?: AbortSignal): Promise<NonNullable<HeyGenStatusResp["data"]>> {
  const start = Date.now();
  const timeout = 5 * 60 * 1000; // 5 min
  while (Date.now() - start < timeout) {
    if (signal?.aborted) throw new Error("Aborted");
    const r = await heygen<HeyGenStatusResp>(`/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`);
    const d = r.data;
    if (!d) throw new Error("HeyGen status missing data");
    if (d.status === "completed") return d;
    if (d.status === "failed") throw new Error(d.error?.message || d.error?.detail || "HeyGen reported failure");
    await new Promise((res) => setTimeout(res, 6000));
  }
  throw new Error("HeyGen render timed out after 5 minutes");
}

export const generateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error: pe } = await supabase.from("products").select("*").eq("id", data.product_id).maybeSingle();
    if (pe || !product) throw new Error("Product not found");

    const avatarId = data.avatar_id || DEFAULT_AVATAR;
    const voiceId = data.voice_id || DEFAULT_VOICE;

    // Balance check before doing any work
    const quota = await heygen<HeyGenQuota>("/v2/user/remaining_quota");
    const remaining = quota.data?.remaining_quota ?? 0;
    if (remaining < MIN_CREDITS) {
      const { data: lc } = await supabase
        .from("videos")
        .insert({
          user_id: userId,
          product_id: product.id,
          voice_id: voiceId,
          heygen_avatar_id: avatarId,
          status: "low_credit",
          duration_seconds: 15,
          error: `HeyGen balance ${remaining} credits is below threshold ${MIN_CREDITS}. Top up and retry.`,
        })
        .select()
        .single();
      throw new Error(`Low HeyGen credit: ${remaining} remaining (need ≥ ${MIN_CREDITS}). Video record: ${lc?.id ?? "n/a"}`);
    }

    const { data: video, error: ve } = await supabase
      .from("videos")
      .insert({
        user_id: userId,
        product_id: product.id,
        voice_id: voiceId,
        heygen_avatar_id: avatarId,
        provider: "heygen",
        status: "scripting",
        duration_seconds: 15,
      })
      .select()
      .single();
    if (ve || !video) throw new Error(ve?.message ?? "video insert failed");

    const patch = async (fields: Parameters<typeof supabase.from<"videos">>[0] extends never ? never : Record<string, unknown>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from("videos").update(fields as any).eq("id", video.id);

    try {
      const script = await generateScript(product);
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
        duration_seconds: Math.round(completed.duration ?? 15),
        error: null,
      });

      return { video_id: video.id, heygen_video_id: heygenVideoId };
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
      .select("id, hook, status, thumbnail_url, created_at, product_id, generation_cost, products(title, source_domain)")
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
