import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Owner-visible private beta state. Read-only, safe for any signed-in user. */
export const getCustomerZeroStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { customerZeroState } = await import("@/lib/customer-zero.server");
    return customerZeroState(context.userId);
  });

const Id = z.object({ id: z.string().uuid() });

async function ctx(userId: string) {
  const { assertCustomerZero } = await import("@/lib/customer-zero.server");
  const { resolveOrgIdForUser } = await import("@/lib/integrations/orgs.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await assertCustomerZero(userId);
  const orgId = await resolveOrgIdForUser(userId);
  return { orgId, db: supabaseAdmin };
}

export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { data } = await db
      .from("campaign_workflows")
      .select("id, name, current_step, status, updated_at, created_at")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false });
    return data ?? [];
  });

export const createWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        source_url: z.string().url().optional().nullable(),
        product_id: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { data: wf, error } = await db
      .from("campaign_workflows")
      .insert({
        org_id: orgId,
        created_by: context.userId,
        name: data.name,
        product_id: data.product_id ?? null,
      })
      .select("id")
      .single();
    if (error || !wf) throw new Error("Could not create the campaign.");

    await db.from("product_briefs").insert({
      workflow_id: wf.id,
      org_id: orgId,
      source_url: data.source_url ?? null,
      product_id: data.product_id ?? null,
    });
    await db.from("outbound_campaigns").insert({ workflow_id: wf.id, org_id: orgId });
    return { id: wf.id as string };
  });

export const getWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Id.parse(d))
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { data: workflow } = await db
      .from("campaign_workflows")
      .select("*")
      .eq("id", data.id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!workflow) throw new Error("Campaign not found.");

    const [brief, strategy, pack, outbound, seq] = await Promise.all([
      db.from("product_briefs").select("*").eq("workflow_id", data.id).maybeSingle(),
      db.from("gtm_strategies").select("*").eq("workflow_id", data.id).maybeSingle(),
      db.from("content_packs").select("*").eq("workflow_id", data.id).maybeSingle(),
      db.from("outbound_campaigns").select("*").eq("workflow_id", data.id).maybeSingle(),
      db
        .from("sequences")
        .select("id, name, provider_sequence_id, active, sequence_steps(id, step_number, subject, body, delay_days)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const outboundId = outbound.data?.id ?? null;
    const leads = outboundId
      ? (
          await db
            .from("leads")
            .select(
              "id, full_name, title, company, company_domain, location, email, email_status, qualification_score, qualification_reason, status, enriched_at, provider_contact_id",
            )
            .eq("outbound_campaign_id", outboundId)
            .order("qualification_score", { ascending: false, nullsFirst: false })
            .limit(200)
        ).data ?? []
      : [];

    const sequences = (seq.data ?? []).filter((s) =>
      outboundId ? true : false,
    );

    return {
      workflow,
      brief: brief.data,
      strategy: strategy.data,
      contentPack: pack.data,
      outbound: outbound.data,
      leads,
      sequences,
    };
  });

export const saveBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        offer: z.string().max(4000).default(""),
        audience: z.string().max(2000).default(""),
        proof_points: z.array(z.string().max(500)).max(20).default([]),
        constraints: z.string().max(2000).default(""),
        source_url: z.string().url().nullable().optional(),
        product_id: z.string().uuid().nullable().optional(),
        approve: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { data: wf } = await db
      .from("campaign_workflows")
      .select("id")
      .eq("id", data.workflow_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!wf) throw new Error("Campaign not found.");

    const { error } = await db.from("product_briefs").upsert(
      {
        workflow_id: data.workflow_id,
        org_id: orgId,
        offer: data.offer,
        audience: data.audience,
        proof_points: data.proof_points,
        constraints: data.constraints,
        source_url: data.source_url ?? null,
        product_id: data.product_id ?? null,
        approved_at: data.approve ? new Date().toISOString() : null,
      },
      { onConflict: "workflow_id" },
    );
    if (error) throw new Error("Could not save the brief.");

    if (data.approve) {
      await db
        .from("campaign_workflows")
        .update({ current_step: 2, product_id: data.product_id ?? null })
        .eq("id", data.workflow_id);
    }
    return { ok: true as const, savedAt: new Date().toISOString() };
  });

/** Ingests a URL with the existing Firecrawl pipeline and pre-fills the brief. */
export const ingestBriefFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        url: z.string().url(),
        asset_kind: z.enum(["ecommerce", "mobile_app", "saas"]).default("ecommerce"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { scrapeSource, extractAsset } = await import("@/lib/campaigns.server");
    const { suggestNetworkForDomain } = await import("@/lib/affiliate-networks");

    const domain = new URL(data.url).hostname.replace(/^www\./, "");
    const markdown = await scrapeSource(data.url);
    const asset = await extractAsset(markdown, data.url, data.asset_kind);

    const { data: product } = await db
      .from("products")
      .insert({
        user_id: context.userId,
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
      .select("id, title, description")
      .single();

    await db.from("product_briefs").upsert(
      {
        workflow_id: data.workflow_id,
        org_id: orgId,
        source_url: data.url,
        product_id: product?.id ?? null,
        offer: `${asset.title}\n\n${asset.description}`.trim(),
        proof_points: asset.angles,
      },
      { onConflict: "workflow_id" },
    );
    await db
      .from("campaign_workflows")
      .update({ product_id: product?.id ?? null })
      .eq("id", data.workflow_id)
      .eq("org_id", orgId);

    return { product, angles: asset.angles };
  });

export const generateStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workflow_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { generateStrategyOutput, STRATEGY_MODEL } = await import("@/lib/workflows.server");

    const { data: brief } = await db
      .from("product_briefs")
      .select("*")
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!brief) throw new Error("Save the product brief first.");

    const out = await generateStrategyOutput({
      offer: brief.offer,
      audience: brief.audience,
      proof_points: (brief.proof_points as string[]) ?? [],
      constraints: brief.constraints,
      source_url: brief.source_url,
    });

    const { error } = await db.from("gtm_strategies").upsert(
      {
        workflow_id: data.workflow_id,
        org_id: orgId,
        icp: out.icp as Record<string, string | string[]>,
        positioning: out.positioning,
        angles: out.angles,
        pillars: out.pillars,
        objections: out.objections,
        cta: out.cta,
        model: STRATEGY_MODEL,
        generated_at: new Date().toISOString(),
        approved_at: null,
      },
      { onConflict: "workflow_id" },
    );
    if (error) throw new Error("Could not save the strategy.");
    return out;
  });

export const saveStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        workflow_id: z.string().uuid(),
        positioning: z.string().max(4000),
        angles: z.array(z.string().max(500)).max(20),
        pillars: z.array(z.string().max(500)).max(20),
        objections: z.array(z.string().max(500)).max(20),
        cta: z.string().max(500),
        approve: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { error } = await db
      .from("gtm_strategies")
      .update({
        positioning: data.positioning,
        angles: data.angles,
        pillars: data.pillars,
        objections: data.objections,
        cta: data.cta,
        approved_at: data.approve ? new Date().toISOString() : null,
      })
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId);
    if (error) throw new Error("Could not save the strategy.");
    if (data.approve) {
      await db
        .from("campaign_workflows")
        .update({ current_step: 3 })
        .eq("id", data.workflow_id)
        .eq("org_id", orgId);
    }
    return { ok: true as const };
  });

export const generateContentPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workflow_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { generateContentPackOutput, STRATEGY_MODEL } = await import("@/lib/workflows.server");

    const [{ data: brief }, { data: strategy }] = await Promise.all([
      db.from("product_briefs").select("*").eq("workflow_id", data.workflow_id).maybeSingle(),
      db.from("gtm_strategies").select("*").eq("workflow_id", data.workflow_id).maybeSingle(),
    ]);
    if (!brief || !strategy) throw new Error("Complete the brief and strategy first.");

    const out = await generateContentPackOutput(
      {
        offer: brief.offer,
        audience: brief.audience,
        proof_points: (brief.proof_points as string[]) ?? [],
        constraints: brief.constraints,
        source_url: brief.source_url,
      },
      {
        icp: (strategy.icp ?? {}) as Record<string, string | string[]>,
        positioning: strategy.positioning,
        angles: (strategy.angles as string[]) ?? [],
        pillars: (strategy.pillars as string[]) ?? [],
        objections: (strategy.objections as string[]) ?? [],
        cta: strategy.cta,
      },
    );

    const { error } = await db.from("content_packs").upsert(
      {
        workflow_id: data.workflow_id,
        org_id: orgId,
        hooks: out.hooks,
        scripts: out.scripts,
        captions: out.captions,
        hashtags: out.hashtags,
        email_angle: out.email_angle,
        model: STRATEGY_MODEL,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "workflow_id" },
    );
    if (error) throw new Error("Could not save the content pack.");

    await db
      .from("campaign_workflows")
      .update({ current_step: 4 })
      .eq("id", data.workflow_id)
      .eq("org_id", orgId);
    return out;
  });

/** Links an existing Campaign Kit (Studio) record to this workflow. */
export const attachCampaignKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ workflow_id: z.string().uuid(), campaign_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId, db } = await ctx(context.userId);
    const { data: campaign } = await db
      .from("campaigns")
      .select("id, user_id")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (!campaign || campaign.user_id !== context.userId) throw new Error("Campaign kit not found.");
    await db
      .from("campaign_workflows")
      .update({ campaign_id: data.campaign_id })
      .eq("id", data.workflow_id)
      .eq("org_id", orgId);
    await db
      .from("content_packs")
      .update({ campaign_id: data.campaign_id })
      .eq("workflow_id", data.workflow_id)
      .eq("org_id", orgId);
    return { ok: true as const };
  });

export type CampaignAnalytics = Awaited<ReturnType<typeof buildAnalytics>>;

async function buildAnalytics(orgId: string, workflowId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

  const { data: wf } = await db
    .from("campaign_workflows")
    .select("id, campaign_id")
    .eq("id", workflowId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!wf) throw new Error("Campaign not found.");

  const { data: outbound } = await db
    .from("outbound_campaigns")
    .select("id")
    .eq("workflow_id", workflowId)
    .maybeSingle();

  const leads = outbound
    ? ((
        await db
          .from("leads")
          .select("status, qualification_score, enriched_at, provider_contact_id")
          .eq("outbound_campaign_id", outbound.id)
      ).data ?? [])
    : [];

  const enrollments = outbound
    ? ((
        await db
          .from("enrollments")
          .select("status, sequences!inner(outbound_campaign_id)")
          .eq("sequences.outbound_campaign_id", outbound.id)
      ).data ?? [])
    : [];

  const variants = wf.campaign_id
    ? ((
        await db
          .from("social_post_variants")
          .select("state, media_url, caption, handed_off_at, posted_at, skipped_at, ready_at")
          .eq("org_id", orgId)
          .in(
            "post_id",
            (
              (await db.from("social_posts").select("id").eq("campaign_id", wf.campaign_id)).data ?? []
            ).map((p) => p.id),
          )
      ).data ?? [])
    : [];

  const links = wf.campaign_id
    ? ((
        await db
          .from("affiliate_links")
          .select("clicks")
          .eq("product_id", (await db.from("campaigns").select("product_id").eq("id", wf.campaign_id).maybeSingle()).data?.product_id ?? "00000000-0000-0000-0000-000000000000")
      ).data ?? [])
    : [];

  const sentEvents = outbound
    ? ((
        await db
          .from("outbound_events")
          .select("type")
          .eq("org_id", orgId)
          .in("type", ["sent", "replied", "bounced", "unsubscribed"])
      ).data ?? [])
    : [];
  const countType = (t: string) => sentEvents.filter((e) => e.type === t).length;

  return {
    social: {
      prepared: variants.filter((v) => Boolean(v.media_url) && v.caption.trim().length > 0).length,
      due: variants.filter((v) => v.ready_at && !v.handed_off_at && !v.posted_at && !v.skipped_at)
        .length,
      handedOff: variants.filter((v) => Boolean(v.handed_off_at)).length,
      confirmedPosted: variants.filter((v) => Boolean(v.posted_at)).length,
      skipped: variants.filter((v) => Boolean(v.skipped_at)).length,
      source: "Share Sheet Hand-Off queue (this database)",
    },
    outbound: {
      sourced: leads.length,
      qualified: leads.filter((l) => (l.qualification_score ?? -1) >= 60).length,
      rejected: leads.filter((l) => l.status === "rejected").length,
      enriched: leads.filter((l) => Boolean(l.enriched_at)).length,
      contactsCreated: leads.filter((l) => Boolean(l.provider_contact_id)).length,
      enrolled: enrollments.filter((e) => e.status === "enrolled").length,
      paused: enrollments.filter((e) => e.status === "paused").length,
      sent: countType("sent"),
      replied: countType("replied"),
      bounced: countType("bounced"),
      unsubscribed: countType("unsubscribed"),
      source: "Apollo pipeline records in this database. Send/reply counts appear only when a validated provider returns them.",
    },
    attribution: {
      clicks: links.reduce((a, l) => a + (l.clicks ?? 0), 0),
      source: "Affiliate short-link click counter (real redirects only)",
    },
    lastSyncAt: new Date().toISOString(),
  };
}

export const getCampaignAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ workflow_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { orgId } = await ctx(context.userId);
    return buildAnalytics(orgId, data.workflow_id);
  });
