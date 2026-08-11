import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { campaignCtx, json, requireWorkflow } from "../campaign.server";

export default defineTool({
  name: "draft_outreach_sequence",
  title: "Draft outreach sequence",
  description:
    "Generate a 3-step cold email sequence from the campaign brief and strategy and save it as an inactive draft. Nothing is pushed to Apollo and no contact is ever enrolled by this tool.",
  inputSchema: {
    campaign_id: z.string().uuid().describe("UUID of the campaign workflow."),
    name: z.string().trim().min(2).max(120).optional().describe("Sequence name (default: campaign name)."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ campaign_id, name }, ctx) => {
    const { orgId, db } = await campaignCtx(ctx);
    const workflow = await requireWorkflow(db, orgId, campaign_id);

    const [{ data: brief }, { data: strategy }, { data: oc }] = await Promise.all([
      db.from("product_briefs").select("*").eq("workflow_id", campaign_id).maybeSingle(),
      db.from("gtm_strategies").select("*").eq("workflow_id", campaign_id).maybeSingle(),
      db.from("outbound_campaigns").select("id").eq("workflow_id", campaign_id).maybeSingle(),
    ]);
    if (!brief || !strategy) throw new ToolError("Complete the brief and strategy first.");
    if (!oc) throw new ToolError("Outbound campaign not found for this campaign.");

    const { generateSequenceDraft } = await import("@/lib/workflows.server");
    const steps = await generateSequenceDraft(
      {
        icp: (strategy.icp ?? {}) as Record<string, string | string[]>,
        positioning: strategy.positioning,
        angles: (strategy.angles as string[]) ?? [],
        pillars: (strategy.pillars as string[]) ?? [],
        objections: (strategy.objections as string[]) ?? [],
        cta: strategy.cta,
      },
      {
        offer: brief.offer,
        audience: brief.audience,
        proof_points: (brief.proof_points as string[]) ?? [],
        constraints: brief.constraints,
        source_url: brief.source_url,
      },
    );
    if (!steps.length) throw new ToolError("The model returned no usable sequence steps. Try again.");

    const sequenceName = name ?? `${workflow.name} outreach`;
    const { data: existing } = await db
      .from("sequences")
      .select("id")
      .eq("outbound_campaign_id", oc.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let sequenceId = existing?.id ?? null;
    if (!sequenceId) {
      const { data: created, error } = await db
        .from("sequences")
        .insert({ org_id: orgId, outbound_campaign_id: oc.id, name: sequenceName, active: false })
        .select("id")
        .single();
      if (error || !created) throw new ToolError("Could not create the sequence draft.");
      sequenceId = created.id;
    } else {
      await db.from("sequences").update({ name: sequenceName }).eq("id", sequenceId);
    }

    for (const s of steps) {
      await db.from("sequence_steps").upsert(
        {
          sequence_id: sequenceId,
          org_id: orgId,
          step_number: s.step_number,
          subject: s.subject,
          body: s.body,
          delay_days: s.delay_days,
        },
        { onConflict: "sequence_id,step_number" },
      );
    }

    return json(`Saved a ${steps.length}-step draft sequence (inactive).`, {
      sequence_id: sequenceId,
      name: sequenceName,
      steps,
      note: "Draft only. Pushing to Apollo and enrolling contacts are separate, explicitly confirmed actions in the app.",
    });
  },
});
