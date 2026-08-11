import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, json } from "../campaign.server";

export default defineTool({
  name: "list_content_waiting_for_approval",
  title: "List content waiting for approval",
  description:
    "List staged campaign assets awaiting human review: unapproved briefs and strategies, generated content packs, and draft social post variants that have not been handed off yet.",
  inputSchema: {
    campaign_id: z
      .string()
      .uuid()
      .optional()
      .describe("Optional campaign UUID to narrow results to one campaign."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ campaign_id }, ctx) => {
    const { orgId, db } = await campaignCtx(ctx);

    const wfQuery = db
      .from("campaign_workflows")
      .select("id, name")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(50);
    const { data: workflows } = campaign_id ? await wfQuery.eq("id", campaign_id) : await wfQuery;
    const ids = (workflows ?? []).map((w) => w.id);
    const nameOf = (id: string) => workflows?.find((w) => w.id === id)?.name ?? id;

    if (!ids.length) return json("No campaigns yet — nothing waiting for approval.", []);

    const [briefs, strategies, packs, variants] = await Promise.all([
      db
        .from("product_briefs")
        .select("workflow_id, approved_at, updated_at")
        .in("workflow_id", ids)
        .is("approved_at", null),
      db
        .from("gtm_strategies")
        .select("workflow_id, approved_at, generated_at")
        .in("workflow_id", ids)
        .is("approved_at", null),
      db
        .from("content_packs")
        .select("workflow_id, generated_at, scripts, captions, hashtags")
        .in("workflow_id", ids),
      db
        .from("social_post_variants")
        .select("id, platform, state, caption, media_url, ready_at, handed_off_at, posted_at")
        .eq("org_id", orgId)
        .is("posted_at", null)
        .is("skipped_at", null)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const items = [
      ...(briefs.data ?? []).map((b) => ({
        kind: "product_brief" as const,
        campaign_id: b.workflow_id,
        campaign: nameOf(b.workflow_id),
        status: "Awaiting approval",
      })),
      ...(strategies.data ?? []).map((s) => ({
        kind: "strategy" as const,
        campaign_id: s.workflow_id,
        campaign: nameOf(s.workflow_id),
        status: "Generated, awaiting approval",
      })),
      ...(packs.data ?? []).map((p) => ({
        kind: "content_pack" as const,
        campaign_id: p.workflow_id,
        campaign: nameOf(p.workflow_id),
        status: "Generated — review scripts and captions",
        scripts: p.scripts,
        captions: p.captions,
        hashtags: p.hashtags,
      })),
      ...(variants.data ?? []).map((v) => ({
        kind: "social_post_variant" as const,
        variant_id: v.id,
        platform: v.platform,
        status: v.handed_off_at ? "Handed off, awaiting posted confirmation" : "Staged",
        has_media: Boolean(v.media_url),
        caption: v.caption,
        ready_at: v.ready_at,
      })),
    ];

    return json(`${items.length} item(s) waiting for review.`, items);
  },
});
