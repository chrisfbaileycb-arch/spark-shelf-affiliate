import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, json, requireWorkflow } from "../campaign.server";

export default defineTool({
  name: "generate_video_scripts",
  title: "Generate video scripts and captions",
  description:
    "Generate the campaign content pack: hooks, two 15-30s short-form scripts, captions with #ad disclosure, and two hashtags. Requires an existing brief and strategy. Saves over the previous pack for this campaign.",
  inputSchema: {
    campaign_id: z.string().uuid().describe("UUID of the campaign workflow."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ campaign_id }, ctx) => {
    const { orgId, db } = await campaignCtx(ctx);
    await requireWorkflow(db, orgId, campaign_id);

    const [{ data: brief }, { data: strategy }] = await Promise.all([
      db.from("product_briefs").select("*").eq("workflow_id", campaign_id).maybeSingle(),
      db.from("gtm_strategies").select("*").eq("workflow_id", campaign_id).maybeSingle(),
    ]);
    if (!brief) throw new ToolError("Save the product brief first.");
    if (!strategy) throw new ToolError("Generate the strategy first.");

    const { generateContentPackOutput, STRATEGY_MODEL } = await import("@/lib/workflows.server");
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
        workflow_id: campaign_id,
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
    if (error) throw new ToolError(`Could not save the content pack: ${error.message}`);

    await db
      .from("campaign_workflows")
      .update({ current_step: 4 })
      .eq("id", campaign_id)
      .eq("org_id", orgId);

    return json("Content pack generated and saved.", out);
  },
});
