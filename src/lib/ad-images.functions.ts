import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RatioEnum = z.enum(["1:1", "9:16", "16:9"]);

const GenerateInput = z.object({
  product_id: z.string().uuid(),
  ratio: RatioEnum,
  angle: z.string().max(300).optional(),
});

export const generateAdImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { buildAdPrompt, renderAdImage, RATIO_SIZE } = await import("@/lib/ad-images.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PLAN_REQUIRED_MESSAGE } = await import("@/lib/plans");
    const { supabase, userId } = context;

    const { data: product, error: pe } = await supabase
      .from("products")
      .select("title, description, price, currency, source_domain, asset_kind")
      .eq("id", data.product_id)
      .maybeSingle();
    if (pe || !product) throw new Error("Product not found");

    // Charge the monthly image allowance before any expensive work; refund on failure.
    const { data: quota, error: qe } = await supabaseAdmin.rpc("consume_image_quota", {
      _user_id: userId,
      _count: 1,
    });
    if (qe) throw new Error(qe.message);
    const q = quota as { ok: boolean; reason?: string; used?: number; limit?: number } | null;
    if (!q?.ok) {
      if (q?.reason === "plan_required" || q?.reason === "no_subscription")
        throw new Error(PLAN_REQUIRED_MESSAGE);
      if (q?.reason === "quota_exceeded")
        throw new Error(
          `Monthly image limit reached (${q.used}/${q.limit}). Upgrade or wait for the next billing period.`,
        );
      if (q?.reason === "subscription_inactive")
        throw new Error("Your subscription is inactive. Update billing to continue.");
      throw new Error(`Cannot generate: ${q?.reason ?? "unknown"}`);
    }

    try {
      const { data: persona } = await supabase
        .from("personas")
        .select("name, vibe, voice_tone, bio")
        .eq("is_default", true)
        .maybeSingle();

      const prompt = buildAdPrompt(product, data.ratio, persona ?? null, {
        kind: (product.asset_kind ?? "ecommerce") as "ecommerce" | "mobile_app" | "saas",
        ...(data.angle ? { angle: data.angle } : {}),
      });
      const bytes = await renderAdImage(prompt, data.ratio);

      const path = `${userId}/${crypto.randomUUID()}.png`;
      const { error: ue } = await supabase.storage
        .from("ad-images")
        .upload(path, bytes, { contentType: "image/png", upsert: false });
      if (ue) throw new Error(`Upload failed: ${ue.message}`);

      const { data: row, error: ie } = await supabase
        .from("ad_images")
        .insert({
          user_id: userId,
          product_id: data.product_id,
          ratio: data.ratio,
          size: RATIO_SIZE[data.ratio],
          prompt,
          storage_path: path,
        })
        .select("id, ratio, size, prompt, storage_path, created_at")
        .single();
      if (ie || !row) throw new Error(ie?.message ?? "Could not save image record");

      const { data: signed } = await supabase.storage
        .from("ad-images")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      return { ...row, url: signed?.signedUrl ?? null };
    } catch (err) {
      await supabaseAdmin.rpc("release_image_quota", { _user_id: userId, _count: 1 });
      throw err;
    }
  });


export const listAdImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await context.supabase
      .from("ad_images")
      .select("id, ratio, size, prompt, storage_path, created_at, product_id, products(title)")
      .order("created_at", { ascending: false })
      .limit(48);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const signed = await Promise.all(
      rows.map(async (r) => {
        const { data: s } = await supabase.storage
          .from("ad-images")
          .createSignedUrl(r.storage_path, 60 * 60 * 24 * 7);
        return { ...r, url: s?.signedUrl ?? null };
      }),
    );
    return signed;
  });

export const deleteAdImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("ad_images")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) await supabase.storage.from("ad-images").remove([row.storage_path]);
    const { error } = await supabase.from("ad_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
