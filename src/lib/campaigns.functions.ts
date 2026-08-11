import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        url: z.string().url(),
        asset_kind: z.enum(["ecommerce", "mobile_app", "saas"]).default("ecommerce"),
        include_video: z.boolean().default(true),
        destination_url: z.string().url().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { scrapeSource, extractAsset, generateAdCopy } = await import("@/lib/campaigns.server");
    const { suggestNetworkForDomain } = await import("@/lib/affiliate-networks");
    const { supabase, userId } = context;

    const domain = new URL(data.url).hostname.replace(/^www\./, "");
    const markdown = await scrapeSource(data.url);
    const asset = await extractAsset(markdown, data.url, data.asset_kind);
    const copy = await generateAdCopy(asset, data.asset_kind);

    const { data: product, error: pe } = await supabase
      .from("products")
      .insert({
        user_id: userId,
        source_url: data.url,
        source_domain: domain,
        title: asset.title,
        description: asset.description,
        price: asset.price,
        currency: asset.currency,
        images: asset.image_urls,
        asset_kind: data.asset_kind,
        raw: { markdown: markdown.slice(0, 4000), angles: asset.angles },
        suggested_network: suggestNetworkForDomain(domain).network,
      })
      .select("id, title, description, price, currency, source_domain, asset_kind")
      .single();
    if (pe || !product) throw new Error(pe?.message ?? "Could not save the extracted asset");

    const slug = asset.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40);

    const { data: campaign, error: ce } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        product_id: product.id,
        source_url: data.url,
        asset_kind: data.asset_kind,
        name: asset.title,
        status: "ready",
        step: "Copy written — ready to render",
        include_video: data.include_video,
        destination_url: data.destination_url ?? data.url,
        utm_campaign: slug || "campaign",
        headline: copy.headline,
        primary_text: copy.primary_text,
        ad_description: copy.description,
      })
      .select("*")
      .single();
    if (ce || !campaign) throw new Error(ce?.message ?? "Could not create the campaign");

    return { campaign, product, copy };
  });

export const generateCampaignImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaign_id: z.string().uuid(),
        ratio: z.enum(["1:1", "9:16", "16:9"]),
        angle: z.string().max(300).optional(),
        with_overlay: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { buildAdPrompt, renderAdImage, RATIO_SIZE } = await import("@/lib/ad-images.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PLAN_REQUIRED_MESSAGE } = await import("@/lib/plans");
    const { supabase, userId } = context;

    const { data: campaign, error: ce } = await supabase
      .from("campaigns")
      .select("id, product_id, asset_kind, headline, primary_text, products(*)")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (ce || !campaign || !campaign.products) throw new Error("Campaign not found");
    const product = campaign.products as unknown as {
      title: string;
      description: string | null;
      price: string | null;
      currency: string | null;
      source_domain: string | null;
    };

    // Charge the image quota before doing expensive work; refund on failure.
    const { consumeQuotaUnlessOwner } = await import("@/lib/owner-override.server");
    const { result: quota, bypassed: quotaBypassed } = await consumeQuotaUnlessOwner(
      userId,
      "consume_image_quota",
      { _user_id: userId, _count: 1 },
    );
    const q = quota as {
      ok: boolean;
      reason?: string;
      used?: number;
      limit?: number;
    } | null;
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

      const kind = (campaign.asset_kind ?? "ecommerce") as "ecommerce" | "mobile_app" | "saas";
      const prompt = buildAdPrompt(product, data.ratio, persona ?? null, {
        kind,
        ...(data.angle ? { angle: data.angle } : {}),
        ...(data.with_overlay && campaign.headline ? { overlay: campaign.headline } : {}),
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
          product_id: campaign.product_id,
          campaign_id: campaign.id,
          ratio: data.ratio,
          size: RATIO_SIZE[data.ratio],
          prompt,
          storage_path: path,
          headline: campaign.headline,
          primary_text: campaign.primary_text,
          mockup_style: kind,
        })
        .select("id, ratio, size, prompt, storage_path, created_at, headline")
        .single();
      if (ie || !row) throw new Error(ie?.message ?? "Could not save image record");

      const { data: signed } = await supabase.storage
        .from("ad-images")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      return { ...row, url: signed?.signedUrl ?? null };
    } catch (err) {
      if (!quotaBypassed)
        await supabaseAdmin.rpc("release_image_quota", { _user_id: userId, _count: 1 });
      throw err;
    }
  });

export const attachCampaignVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ campaign_id: z.string().uuid(), video_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("campaigns")
      .update({ video_id: data.video_id, status: "complete", step: "Campaign kit ready" })
      .eq("id", data.campaign_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        destination_url: z.string().url().optional(),
        utm_source: z.string().max(60).optional(),
        utm_medium: z.string().max(60).optional(),
        utm_campaign: z.string().max(80).optional(),
        headline: z.string().max(40).optional(),
        primary_text: z.string().max(300).optional(),
        ad_description: z.string().max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("campaigns").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("campaigns")
      .select("id, name, status, step, asset_kind, source_url, created_at, video_id")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCampaignKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*, products(*), videos(id, status, video_url, thumbnail_url, caption, hook)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign) throw new Error("Campaign not found");

    const { data: images } = await supabase
      .from("ad_images")
      .select("id, ratio, size, storage_path, headline, created_at")
      .eq("campaign_id", data.id)
      .order("created_at", { ascending: true });

    const assets = await Promise.all(
      (images ?? []).map(async (r) => {
        const { data: s } = await supabase.storage
          .from("ad-images")
          .createSignedUrl(r.storage_path, 60 * 60 * 24 * 7);
        return { ...r, url: s?.signedUrl ?? null };
      }),
    );

    return { campaign, assets };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
