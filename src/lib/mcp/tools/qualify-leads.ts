import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, json, requireWorkflow } from "../campaign.server";

export default defineTool({
  name: "qualify_leads",
  title: "Qualify leads against the brief",
  description:
    "Score the campaign's unscored leads 0-100 against the approved ICP and positioning, marking each qualified or rejected against the campaign threshold.",
  inputSchema: {
    campaign_id: z.string().uuid().describe("UUID of the campaign workflow."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ campaign_id }, ctx) => {
    const { orgId, db } = await campaignCtx(ctx);
    await requireWorkflow(db, orgId, campaign_id);

    const [{ data: strategy }, { data: oc }] = await Promise.all([
      db.from("gtm_strategies").select("icp, positioning").eq("workflow_id", campaign_id).maybeSingle(),
      db
        .from("outbound_campaigns")
        .select("id, qualification_threshold")
        .eq("workflow_id", campaign_id)
        .maybeSingle(),
    ]);
    if (!strategy) throw new ToolError("Generate the strategy before qualifying leads.");
    if (!oc) throw new ToolError("Outbound campaign not found for this campaign.");

    const { data: leads } = await db
      .from("leads")
      .select("id, full_name, title, company, company_domain, location")
      .eq("outbound_campaign_id", oc.id)
      .is("qualified_at", null)
      .limit(50);
    if (!leads?.length) return json("No unscored leads to qualify.", { scored: 0 });

    const { qualifyLeadsWithAi, STRATEGY_MODEL } = await import("@/lib/workflows.server");
    const results = await qualifyLeadsWithAi(
      (strategy.icp ?? {}) as Record<string, string | string[]>,
      strategy.positioning,
      leads,
    );

    const now = new Date().toISOString();
    for (const r of results) {
      await db
        .from("leads")
        .update({
          qualification_score: r.score,
          qualification_reason: r.reason,
          qualification_model: STRATEGY_MODEL,
          qualified_at: now,
          status: r.score >= oc.qualification_threshold ? "qualified" : "rejected",
        })
        .eq("id", r.id)
        .eq("outbound_campaign_id", oc.id);
    }

    return json(`Scored ${results.length} lead(s).`, {
      threshold: oc.qualification_threshold,
      results,
    });
  },
});
