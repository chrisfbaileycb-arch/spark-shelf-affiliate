import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, json, requireWorkflow } from "../campaign.server";

export default defineTool({
  name: "get_campaign",
  title: "Get campaign details",
  description:
    "Fetch one campaign with its brief, strategy, content pack, outbound status, lead counts and step status badges.",
  inputSchema: {
    campaign_id: z.string().uuid().describe("UUID of the campaign workflow."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ campaign_id }, ctx) => {
    const { orgId, db } = await campaignCtx(ctx);
    const workflow = await requireWorkflow(db, orgId, campaign_id);

    const [brief, strategy, pack, outbound] = await Promise.all([
      db.from("product_briefs").select("*").eq("workflow_id", campaign_id).maybeSingle(),
      db.from("gtm_strategies").select("*").eq("workflow_id", campaign_id).maybeSingle(),
      db.from("content_packs").select("*").eq("workflow_id", campaign_id).maybeSingle(),
      db.from("outbound_campaigns").select("*").eq("workflow_id", campaign_id).maybeSingle(),
    ]);

    const leads = outbound.data
      ? ((
          await db
            .from("leads")
            .select("status, qualification_score, enriched_at")
            .eq("outbound_campaign_id", outbound.data.id)
        ).data ?? [])
      : [];

    return json(`Campaign "${workflow.name}".`, {
      workflow,
      badges: {
        brief: brief.data?.approved_at ? "Approved" : brief.data ? "Draft" : "Not started",
        strategy: strategy.data?.approved_at
          ? "Approved"
          : strategy.data
            ? "Generated"
            : "Not started",
        content_pack: pack.data ? "Generated" : "Not started",
        outbound: outbound.data?.status ?? "Not started",
      },
      brief: brief.data,
      strategy: strategy.data,
      content_pack: pack.data,
      outbound: outbound.data,
      lead_counts: {
        total: leads.length,
        qualified: leads.filter((l) => l.status === "qualified").length,
        rejected: leads.filter((l) => l.status === "rejected").length,
        enriched: leads.filter((l) => Boolean(l.enriched_at)).length,
      },
    });
  },
});
