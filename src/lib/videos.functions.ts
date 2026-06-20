import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GenerateInput = z.object({
  product_id: z.string().uuid(),
  voice_id: z.string().default("cgSgspJ2msm6clMCkdW9"), // Jessica
  influencer_style: z.string().optional(),
});

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1";

interface ScriptOut {
  hook: string;
  script: string; // 15s of spoken copy, ~35-45 words
  caption: string;
  hashtags: string[];
  scene_prompts: string[]; // 3 image prompts for B-roll cuts
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
          "You write punchy 15-second TikTok scripts for a 25-year-old female lifestyle influencer doing affiliate marketing. Tone: warm, excited, conversational, zero corporate. ALWAYS open with a strong scroll-stopping hook. End with a clear 'link in bio' CTA. Reply ONLY with strict JSON: {hook, script, caption, hashtags[], scene_prompts[]}. script must be 35-45 spoken words (≈15s at normal pace). hashtags: 8 lowercase, no #. scene_prompts: 3 detailed visual prompts for cinematic vertical product photography / lifestyle shots (no people in 2-3, product hero in 1).",
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
      scene_prompts: Array.isArray(parsed.scene_prompts) ? parsed.scene_prompts.map(String).slice(0, 4) : [],
    };
  } catch {
    throw new Error("AI returned malformed script JSON");
  }
}

async function generateVoiceMp3(text: string, voiceId: string): Promise<Uint8Array> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ElevenLabs not connected");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true, speed: 1.05 },
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs failed (${res.status}): ${await res.text().catch(() => "")}`);
  return new Uint8Array(await res.arrayBuffer());
}

interface AiImage { mimeType: string; bytes: Uint8Array }

async function generateInfluencerImage(prompt: string): Promise<AiImage> {
  const key = process.env.LOVABLE_API_KEY!;
  const res = await fetch(`${AI_GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    if (res.status === 402) throw new Error("Lovable AI credits exhausted.");
    throw new Error(`Image gen failed (${res.status})`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
  };
  const dataUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl || !dataUrl.startsWith("data:")) throw new Error("AI did not return an image");
  const [meta, b64] = dataUrl.split(",");
  const mimeType = meta.replace("data:", "").replace(";base64", "") || "image/png";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mimeType, bytes };
}

async function uploadToStorage(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  bucket: string,
  path: string,
  bytes: Uint8Array,
  contentType: string,
) {
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export const generateVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: product, error: pe } = await supabase.from("products").select("*").eq("id", data.product_id).maybeSingle();
    if (pe || !product) throw new Error("Product not found");

    // Insert video row up front (status=scripting)
    const { data: video, error: ve } = await supabase
      .from("videos")
      .insert({
        user_id: userId,
        product_id: product.id,
        voice_id: data.voice_id,
        status: "scripting",
        duration_seconds: 15,
      })
      .select()
      .single();
    if (ve || !video) throw new Error(ve?.message ?? "video insert failed");

    const setStatus = async (status: string, patch: Record<string, unknown> = {}) =>
      supabase.from("videos").update({ status, ...patch }).eq("id", video.id);

    try {
      const script = await generateScript(product);
      await setStatus("generating_voice", {
        hook: script.hook,
        script: script.script,
        caption: script.caption,
        hashtags: script.hashtags,
      });

      // Voice
      const fullVoice = `${script.hook} ${script.script}`.trim();
      const mp3 = await generateVoiceMp3(fullVoice, data.voice_id);
      const audioPath = `${userId}/${video.id}/voice.mp3`;
      const audioUrl = await uploadToStorage(supabase as never, "videos", audioPath, mp3, "audio/mpeg");

      // Influencer + scene images
      await setStatus("generating_images");
      const stylePrefix =
        data.influencer_style ||
        "Photorealistic 9:16 vertical photo of a 25-year-old female lifestyle influencer with warm friendly energy, soft natural daylight, casual chic outfit, soft makeup, shallow depth of field, magazine-quality, no text, no logos.";

      const heroPrompt = `${stylePrefix} She is enthusiastically showing/holding/using the product: "${product.title}". Engaging eye contact with the camera. Bright, fresh color palette.`;
      const scenePrompts = (script.scene_prompts.length ? script.scene_prompts : [
        `Cinematic vertical 9:16 product photography of "${product.title}", soft daylight, lifestyle setting, no text.`,
        `Close-up macro shot highlighting a key detail of "${product.title}", crisp focus, no text.`,
      ]).slice(0, 3);

      const imagePrompts = [heroPrompt, ...scenePrompts];
      const generated = await Promise.all(imagePrompts.map(async (p, i) => {
        try {
          const img = await generateInfluencerImage(p);
          const ext = img.mimeType.includes("png") ? "png" : "jpg";
          const path = `${userId}/${video.id}/scene-${i}.${ext}`;
          const url = await uploadToStorage(supabase as never, "videos", path, img.bytes, img.mimeType);
          return { index: i, url, prompt: p };
        } catch (e) {
          console.warn("image gen failed", i, e);
          return null;
        }
      }));
      const sceneUrls = generated.filter((x): x is { index: number; url: string | null; prompt: string } => !!x && !!x.url);

      // Use first scene as thumbnail
      const thumb = sceneUrls[0]?.url ?? null;

      await supabase.from("videos").update({
        status: "ready",
        thumbnail_url: thumb,
        video_url: audioUrl, // audio file URL — UI plays it with the animated frames
        error: null,
      }).eq("id", video.id);

      // Stash scene URLs in raw via products? Simplest: add to video row via metadata column? We don't have one.
      // Store scenes by writing a manifest.json to storage.
      const manifest = {
        audio_url: audioUrl,
        scenes: sceneUrls.map((s) => ({ url: s.url, prompt: s.prompt })),
        hook: script.hook,
        script: script.script,
        caption: script.caption,
        hashtags: script.hashtags,
      };
      await uploadToStorage(
        supabase as never,
        "videos",
        `${userId}/${video.id}/manifest.json`,
        new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
        "application/json",
      );

      return { video_id: video.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase.from("videos").update({ status: "failed", error: message }).eq("id", video.id);
      throw err;
    }
  });

export const listVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("videos")
      .select("id, hook, status, thumbnail_url, created_at, product_id, products(title, source_domain)")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getVideoBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: video, error } = await supabase
      .from("videos")
      .select("*, products(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!video) throw new Error("Video not found");

    // Load scene manifest from storage and refresh signed URLs for everything we need.
    const manifestPath = `${userId}/${video.id}/manifest.json`;
    const { data: manifestBlob } = await supabase.storage.from("videos").download(manifestPath);
    let manifest: { audio_url?: string; scenes?: Array<{ url: string; prompt: string }> } = {};
    if (manifestBlob) {
      try {
        manifest = JSON.parse(await manifestBlob.text());
      } catch {
        /* ignore */
      }
    }

    // Re-sign URLs (signed URLs expire) by listing files in the folder.
    const folder = `${userId}/${video.id}`;
    const { data: files } = await supabase.storage.from("videos").list(folder);
    const signed: Record<string, string> = {};
    if (files) {
      for (const f of files) {
        if (f.name === "manifest.json") continue;
        const { data: s } = await supabase.storage.from("videos").createSignedUrl(`${folder}/${f.name}`, 60 * 60 * 24);
        if (s?.signedUrl) signed[f.name] = s.signedUrl;
      }
    }

    const sceneNames = Object.keys(signed).filter((n) => n.startsWith("scene-")).sort();
    const scenes = sceneNames.map((n, i) => ({
      url: signed[n],
      prompt: manifest.scenes?.[i]?.prompt ?? "",
    }));

    return {
      video,
      audio_url: signed["voice.mp3"] ?? null,
      scenes,
    };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const folder = `${userId}/${data.id}`;
    const { data: files } = await supabase.storage.from("videos").list(folder);
    if (files?.length) {
      await supabase.storage.from("videos").remove(files.map((f) => `${folder}/${f.name}`));
    }
    const { error } = await supabase.from("videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
